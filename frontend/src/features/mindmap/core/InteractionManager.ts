import { MOUSE_DOWN } from "@/constants/mouse";
import QuadTree from "@/features/mindmap/core/QuadTree";
import TreeContainer from "@/features/mindmap/core/TreeContainer";
import { MindMapEvents } from "@/features/mindmap/types/events";
import { BaseNodeInfo, InteractionMode } from "@/features/mindmap/types/interaction";
import { NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { calcDistance } from "@/utils/calc_distance";
import { EventBroker } from "@/utils/EventBroker";

const DRAG_THRESHOLD = 5;

export class MindmapInteractionManager {
    private broker: EventBroker<MindMapEvents>;
    private container: TreeContainer;

    private quadTree: QuadTree;
    private onUpdate: () => void;
    private onPan: (dx: number, dy: number) => void;
    private onMoveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection) => void;

    // 상태 변수
    private mode: InteractionMode = "idle";
    private startMousePos = { x: 0, y: 0 };
    private lastMousePos = { x: 0, y: 0 };
    private draggingNodeId: NodeId | null = null;
    private dragDelta = { x: 0, y: 0 };
    private mousePos = { x: 0, y: 0 };
    private dragSubtreeIds: Set<NodeId> | null = null;
    private baseNode: BaseNodeInfo = {
        targetId: null,
        direction: null,
    };
    private screenToWorld: (x: number, y: number) => { x: number; y: number };

    // dragging 중 nearest의 parent 변경 시 children 캐시
    private cachedParentId: NodeId | null = null;
    private cachedChildren: NodeElement[] = [];

    constructor(
        broker: EventBroker<MindMapEvents>,
        container: TreeContainer,
        quadTree: QuadTree,
        onUpdate: () => void,
        onPan: (dx: number, dy: number) => void,
        onMoveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection) => void,
        screenToWorld: (x: number, y: number) => { x: number; y: number },
    ) {
        this.broker = broker;
        this.container = container;
        this.quadTree = quadTree;
        this.onUpdate = onUpdate;
        this.onPan = onPan;
        this.onMoveNode = onMoveNode;
        this.screenToWorld = screenToWorld;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.broker.subscribe({ key: "RAW_MOUSE_DOWN", callback: (e) => this.handleMouseDown(e as React.MouseEvent) });
        this.broker.subscribe({ key: "RAW_MOUSE_MOVE", callback: (e) => this.handleMouseMove(e as React.MouseEvent) });
        this.broker.subscribe({ key: "RAW_MOUSE_UP", callback: (e) => this.handleMouseUp(e as React.MouseEvent) });

        this.broker.subscribe({
            key: "NODE_CLICK",
            callback: ({ nodeId, event }) => this.handleNodeClick(nodeId, event as React.MouseEvent),
        });
    }

    private projectScreenToWorld(clientX: number, clientY: number) {
        return this.screenToWorld(clientX, clientY);
    }
    /**
     * 드롭 타겟 탐색
     *  기준점: 현재 마우스의 World 좌표(mouseX/mouseY)
     *  탐색 범위: World 단위 threshold (줌이 바뀌어도 월드 반경은 동일)
     *  QuadTree는 World 좌표를 저장하므로 반드시 World Range로 탐색
     */
    private updateDropTarget(e: React.MouseEvent) {
        // 드래그 중이거나 노드 생성 중일 때만 타겟 계산 수행
        if (this.mode !== "dragging" && this.mode !== "pending_creation") {
            return;
        }

        // 1) 월드 좌표 계산
        const { x: mouseX, y: mouseY } = this.projectScreenToWorld(e.clientX, e.clientY);

        // 2) movingFragment(드래그 서브트리) 제외 헬퍼
        const isDragging = this.mode === "dragging";
        const isExcluded = (id: NodeId) => {
            return isDragging && !!this.dragSubtreeIds && this.dragSubtreeIds.has(id);
        };

        const scopeSteps: Array<{
            depth: number;
            parentId: NodeId;
            side: "left" | "right";
            parentWallX: number;
            outerWallX: number;
            isBeyondOuterWall: boolean;
            childrenCount: number;
            chosenNextParentId?: NodeId;
        }> = [];

        // 3) parent 스코프 결정 (X 밴드 기반 재귀 하강)
        let parentNode: NodeElement = this.container.getRootNode();

        // root는 좌/우 branch 먼저 결정
        let side: "left" | "right" = mouseX < parentNode.x ? "left" : "right";

        // 무한 루프 방지
        let depthGuard = 0;

        while (depthGuard++ < 20) {
            // 현재 parent의 children
            let childrenForBand = this.container.getChildNodes(parentNode.id);

            // root면 side에 해당하는 그룹만
            if (parentNode.type === "root") {
                childrenForBand = childrenForBand.filter((c) => c.addNodeDirection === side);
            }

            // movingFragment(드래그 서브트리) 제외
            childrenForBand = childrenForBand.filter((c) => !isExcluded(c.id));

            // 자식이 없으면 더 내려갈 수 없음 → parent 확정
            if (childrenForBand.length === 0) {
                const parentWallX =
                    side === "right" ? parentNode.x + parentNode.width / 2 : parentNode.x - parentNode.width / 2;

                scopeSteps.push({
                    depth: depthGuard,
                    parentId: parentNode.id,
                    side,
                    parentWallX,
                    outerWallX: parentWallX,
                    isBeyondOuterWall: false,
                    childrenCount: 0,
                });
                break;
            }

            // parent wall (자식이 붙는 방향의 벽)
            const parentWallX =
                side === "right" ? parentNode.x + parentNode.width / 2 : parentNode.x - parentNode.width / 2;

            // outer wall (자식 컬럼 바깥쪽 벽) = 자식들의 "바깥쪽" x 경계 중 최외곽
            let outerWallX = parentWallX;

            for (const child of childrenForBand) {
                const childEdgeX = side === "right" ? child.x + child.width / 2 : child.x - child.width / 2;

                outerWallX = side === "right" ? Math.max(outerWallX, childEdgeX) : Math.min(outerWallX, childEdgeX);
            }

            // band 밖(더 바깥)인지 판단
            const isBeyondOuterWall = side === "right" ? mouseX > outerWallX : mouseX < outerWallX;

            scopeSteps.push({
                depth: depthGuard,
                parentId: parentNode.id,
                side,
                parentWallX,
                outerWallX,
                isBeyondOuterWall,
                childrenCount: childrenForBand.length,
            });

            // band 안이면 parent 확정
            if (!isBeyondOuterWall) {
                break;
            }

            // band 밖이면 → Y 기준으로 가장 가까운 child로 하강 (O(k))
            let nextParent: NodeElement = childrenForBand[0]!;
            let minYDist = Math.abs(mouseY - nextParent.y);

            for (let i = 1; i < childrenForBand.length; i++) {
                const c = childrenForBand[i]!;
                const d = Math.abs(mouseY - c.y);

                // tie면 아래(below, y가 큰 쪽) 선택 = 네 규칙(기아 선택)
                if (d < minYDist || (d === minYDist && c.y > nextParent.y)) {
                    nextParent = c;
                    minYDist = d;
                }
            }

            // 스텝에 선택 결과 기록
            scopeSteps[scopeSteps.length - 1]!.chosenNextParentId = nextParent.id;

            // 안전장치: 자기 자신/자손으로 하강 방지 (이미 childrenForBand에서 제외했지만 2중 안전)
            if (isExcluded(nextParent.id)) {
                break;
            }

            parentNode = nextParent;

            // 다음 레벨 side 갱신
            if (parentNode.type === "root") {
                side = mouseX < parentNode.x ? "left" : "right";
            } else {
                side = parentNode.addNodeDirection;
            }
        }

        // 최종 parentNode의 children을 기준으로 "삽입 위치(prev/next/child)" 결정
        let children = this.container.getChildNodes(parentNode.id);

        if (parentNode.type === "root") {
            children = children.filter((c) => c.addNodeDirection === side);
        }

        children = children.filter((c) => !isExcluded(c.id));

        // leaf면 무조건 child
        if (children.length === 0) {
            this.baseNode = {
                targetId: parentNode.id,
                direction: "child",
            };
            return;
        }

        const ordered = [...children].sort((a, b) => a.y - b.y);

        // insertIndex = mouseY보다 y가 큰 첫 원소의 index
        // (mouseY === child.y면 "next로 보자" 규칙에 맞게, equal은 건너뛰도록 mouseY < 로 비교)
        let insertIndex = -1;
        for (let i = 0; i < ordered.length; i++) {
            if (mouseY < ordered[i]!.y) {
                insertIndex = i;
                break;
            }
        }
        if (insertIndex === -1) insertIndex = ordered.length;

        // 맨 위: first.prev
        if (insertIndex <= 0) {
            const first = ordered[0]!;
            this.baseNode = {
                targetId: first.id,
                direction: "prev",
            };
            return;
        }

        // 맨 아래: last.next
        if (insertIndex >= ordered.length) {
            const last = ordered[ordered.length - 1]!;
            this.baseNode = {
                targetId: last.id,
                direction: "next",
            };
            return;
        }

        // 중간: ref.prev (ref 앞)
        const ref = ordered[insertIndex]!;
        this.baseNode = {
            targetId: ref.id,
            direction: "prev",
        };
    }

    /** Interaction 상태 리셋 */
    private clearStatus() {
        this.mode = "idle";
        this.draggingNodeId = null;
        this.dragDelta = { x: 0, y: 0 };
        this.dragSubtreeIds = null;

        this.baseNode = { targetId: null, direction: null };
    }

    getInteractionStatus() {
        return {
            mode: this.mode,
            draggingNodeId: this.draggingNodeId,
            dragDelta: this.dragDelta,
            mousePos: this.mousePos,
            dragSubtreeIds: this.dragSubtreeIds,
            baseNode: this.baseNode,
        };
    }

    /** 노드 클릭 */
    // TODO: 노드 리액트 컴포넌트에서 마우스 누를때 e.stopPropabation 추가 필수
    private handleNodeClick = (nodeId: NodeId, e: React.MouseEvent) => {
        const node = this.container.safeGetNode(nodeId);
        if (!node || node.type === "root") return;

        this.draggingNodeId = nodeId;
        this.mode = "potential_drag";
        this.startMousePos = { x: e.clientX, y: e.clientY };
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.dragDelta = { x: 0, y: 0 };
    };

    /** 배경 클릭 */
    handleMouseDown = (e: React.MouseEvent) => {
        const isPanningButton =
            e.button === MOUSE_DOWN.left || e.button === MOUSE_DOWN.wheel || e.button === MOUSE_DOWN.right;

        if (!isPanningButton) return;

        this.startMousePos = { x: e.clientX, y: e.clientY };
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.mode = "panning";
    };

    handleMouseMove(e: React.MouseEvent): { dx: number; dy: number } {
        const clientX = e.clientX;
        const clientY = e.clientY;

        // 이전 프레임 좌표와 현재 좌표의 차이
        const dx = clientX - this.lastMousePos.x;
        const dy = clientY - this.lastMousePos.y;

        // 현재 마우스 위치 실시간 반영
        this.mousePos = this.projectScreenToWorld(clientX, clientY);

        switch (this.mode) {
            case "idle":
                break;

            case "panning":
                if (e.buttons > 0) {
                    this.onPan(dx, dy);
                }
                break;

            // 일정 거리 이상 움직여야 dragging 모드로 전환
            case "potential_drag": {
                const dist = calcDistance(clientX, clientY, this.startMousePos.x, this.startMousePos.y);
                if (dist > DRAG_THRESHOLD) {
                    this.mode = "dragging";

                    // 드래그 시작 시, 이동 중인 노드의 모든 자식 노드 ID 미리 저장
                    if (this.draggingNodeId) {
                        this.dragSubtreeIds = this.container.getAllDescendantIds(this.draggingNodeId);
                    }
                    this.onUpdate();
                }
                break;
            }

            case "dragging": {
                // 이전 프레임 마우스 → 월드 좌표
                const prevWorld = this.projectScreenToWorld(this.lastMousePos.x, this.lastMousePos.y);

                // 현재 프레임 마우스 → 월드 좌표
                const nextWorld = this.projectScreenToWorld(clientX, clientY);

                // 이전 프레임 -> 현재 프레임 월드 좌표 차이
                const worldDx = nextWorld.x - prevWorld.x;
                const worldDy = nextWorld.y - prevWorld.y;

                this.dragDelta = {
                    x: this.dragDelta.x + worldDx,
                    y: this.dragDelta.y + worldDy,
                };

                this.updateDropTarget(e);
                this.onUpdate();
                break;
            }

            case "pending_creation": {
                this.updateDropTarget(e);
                this.onUpdate();
                break;
            }
        }
        this.lastMousePos = { x: clientX, y: clientY };
        return { dx, dy };
    }

    handleMouseUp = (_e: React.MouseEvent) => {
        if (this.mode === "dragging" && this.draggingNodeId && this.baseNode.targetId) {
            const targetNodeId = this.baseNode.targetId;
            const movingNodeId = this.draggingNodeId;
            const direction = this.baseNode.direction;

            const isDroppingOnItseltOrDescendant = this.dragSubtreeIds?.has(targetNodeId);

            if (!isDroppingOnItseltOrDescendant && direction) {
                const targetNode = this.container.safeGetNode(targetNodeId);

                if (targetNode) {
                    this.onMoveNode(targetNodeId, movingNodeId, direction);
                }
            }
        }

        // 리렌더링이 필요한 모드인지
        const shouldUpdateReact = this.mode === "dragging";

        this.clearStatus();

        if (shouldUpdateReact) {
            this.onUpdate();
        }
    };

    // 새로운 노드 추가 TODO: 외부에서 버튼 클릭 시 이 모드가 되어야 함
    public startCreating = () => {
        this.mode = "pending_creation";
    };

    public getInteractionMode() {
        return this.mode;
    }
}
