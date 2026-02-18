import { MOUSE_DOWN } from "@/constants/mouse";
import QuadTree from "@/features/mindmap/core/QuadTree";
import TreeContainer from "@/features/mindmap/core/TreeContainer";
import { MindMapEvents } from "@/features/mindmap/types/events";
import {
    BaseNodeInfo,
    DragSessionSnapshot,
    EMPTY_DRAG_SESSION_SNAPSHOT,
    EMPTY_INTERACTION_SNAPSHOT,
    InteractionMode,
    InteractionSnapshot,
} from "@/features/mindmap/types/interaction";
import { AddNodeDirection, NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { calcDistance } from "@/utils/calc_distance";
import { EventBroker } from "@/utils/EventBroker";

const DRAG_THRESHOLD = 5;

export class MindmapInteractionManager {
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
    private selectedNodeId: NodeId | null = null;

    private interactionSnapshot: InteractionSnapshot = EMPTY_INTERACTION_SNAPSHOT;
    private dragSessionSnapshot: DragSessionSnapshot = EMPTY_DRAG_SESSION_SNAPSHOT;

    constructor(
        private broker: EventBroker<MindMapEvents>,
        private container: TreeContainer,
        private quadTree: QuadTree,
        private onPan: (dx: number, dy: number) => void,
        private onMoveNode: (
            targetId: NodeId,
            movingId: NodeId,
            direction: NodeDirection,
            addNodeDirection?: AddNodeDirection,
        ) => void,
        private screenToWorld: (x: number, y: number) => { x: number; y: number },
        private deleteNode: (id: NodeId) => void,
    ) {
        this.commitInteractionSnapshot();
        this.commitDragSessionSnapshot();
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.broker.subscribe({
            key: "NODE_CLICK",
            callback: ({ nodeId, event }) => {
                this.selectedNodeId = nodeId;
                this.handleNodeClick(nodeId, event as React.MouseEvent);
            },
        });
        this.broker.subscribe({
            key: "RAW_MOUSE_DOWN",
            callback: (e) => {
                this.selectedNodeId = null;
                this.handleMouseDown(e as React.MouseEvent);
            },
        });
        this.broker.subscribe({ key: "RAW_MOUSE_MOVE", callback: (e) => this.handleMouseMove(e as React.MouseEvent) });
        this.broker.subscribe({ key: "RAW_MOUSE_UP", callback: (e) => this.handleMouseUp(e as React.MouseEvent) });

        this.broker.subscribe({
            key: "NODE_DELETE",
            callback: () => {
                if (this.selectedNodeId) {
                    this.deleteNode(this.selectedNodeId);
                    this.selectedNodeId = null;
                }
            },
        });
    }

    private projectScreenToWorld(clientX: number, clientY: number) {
        return this.screenToWorld(clientX, clientY);
    }

    private updateDropTarget(e: React.MouseEvent) {
        if (this.mode !== "dragging" && this.mode !== "pending_creation") return;

        const { x: mouseX, y: mouseY } = this.projectScreenToWorld(e.clientX, e.clientY);

        const isDragging = this.mode === "dragging";
        const isExcluded = (id: NodeId) => isDragging && !!this.dragSubtreeIds && this.dragSubtreeIds.has(id);

        let parentNode: NodeElement = this.container.getRootNode();

        let side: AddNodeDirection = mouseX < parentNode.x ? "left" : "right";

        let depthGuard = 0;

        while (depthGuard++ < 20) {
            let childrenForBand = this.container.getChildNodes(parentNode.id);

            if (parentNode.type === "root") {
                childrenForBand = childrenForBand.filter((c) => c.addNodeDirection === side);
            }

            childrenForBand = childrenForBand.filter((c) => !isExcluded(c.id));

            if (childrenForBand.length === 0) {
                this.baseNode = {
                    targetId: parentNode.id,
                    direction: "child",
                    side,
                };
                return;
            }
            const parentWallX =
                side === "right" ? parentNode.x + parentNode.width / 2 : parentNode.x - parentNode.width / 2;

            let outerWallX = parentWallX;

            for (const child of childrenForBand) {
                const childEdgeX = side === "right" ? child.x + child.width / 2 : child.x - child.width / 2;
                outerWallX = side === "right" ? Math.max(outerWallX, childEdgeX) : Math.min(outerWallX, childEdgeX);
            }

            const isBeyondOuterWall = side === "right" ? mouseX > outerWallX : mouseX < outerWallX;

            if (!isBeyondOuterWall) break;

            let nextParent: NodeElement = childrenForBand[0]!;
            let minYDist = Math.abs(mouseY - nextParent.y);

            for (let i = 1; i < childrenForBand.length; i++) {
                const c = childrenForBand[i]!;
                const d = Math.abs(mouseY - c.y);
                if (d < minYDist || (d === minYDist && c.y > nextParent.y)) {
                    nextParent = c;
                    minYDist = d;
                }
            }

            if (isExcluded(nextParent.id)) break;

            parentNode = nextParent;

            // 다음 레벨 side 갱신
            if (parentNode.type === "root") {
                side = mouseX < parentNode.x ? "left" : "right";
            } else {
                side = parentNode.addNodeDirection;
            }
        }
        let children = this.container.getChildNodes(parentNode.id);

        if (parentNode.type === "root") {
            children = children.filter((c) => c.addNodeDirection === side);
        }

        children = children.filter((c) => !isExcluded(c.id));

        if (children.length === 0) {
            this.baseNode = {
                targetId: parentNode.id,
                direction: "child",
                side,
            };
            return;
        }

        const ordered = [...children].sort((a, b) => a.y - b.y);

        let insertIndex = -1;
        for (let i = 0; i < ordered.length; i++) {
            if (mouseY < ordered[i]!.y) {
                insertIndex = i;
                break;
            }
        }
        if (insertIndex === -1) insertIndex = ordered.length;

        if (insertIndex <= 0) {
            const first = ordered[0]!;
            this.baseNode = { targetId: first.id, direction: "prev", side };
            return;
        }

        if (insertIndex >= ordered.length) {
            const last = ordered[ordered.length - 1]!;
            this.baseNode = { targetId: last.id, direction: "next", side };
            return;
        }

        const ref = ordered[insertIndex]!;
        this.baseNode = { targetId: ref.id, direction: "prev", side };
    }

    private clearStatus() {
        this.mode = "idle";
        this.draggingNodeId = null;
        this.dragDelta = { x: 0, y: 0 };
        this.dragSubtreeIds = null;
        this.baseNode = { targetId: null, direction: null, side: null };
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
    private handleMouseDown = (e: React.MouseEvent) => {
        const isPanningButton =
            e.button === MOUSE_DOWN.left || e.button === MOUSE_DOWN.wheel || e.button === MOUSE_DOWN.right;

        if (!isPanningButton) return;

        this.startMousePos = { x: e.clientX, y: e.clientY };
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.mode = "panning";
    };

    private handleMouseMove(e: React.MouseEvent): { dx: number; dy: number } {
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
                    // ghost 1회 + 첫 프레임
                    this.emitDragSession();
                    this.emitInteractionFrame();
                }
                break;
            }

            case "dragging": {
                if (e.buttons === 0) {
                    this.handleMouseUp(e);
                    this.lastMousePos = { x: clientX, y: clientY };
                    return { dx, dy };
                }

                const prevWorld = this.projectScreenToWorld(this.lastMousePos.x, this.lastMousePos.y);
                const nextWorld = this.projectScreenToWorld(clientX, clientY);

                const worldDx = nextWorld.x - prevWorld.x;
                const worldDy = nextWorld.y - prevWorld.y;

                this.dragDelta = { x: this.dragDelta.x + worldDx, y: this.dragDelta.y + worldDy };

                this.updateDropTarget(e);
                this.emitInteractionFrame();
                break;
            }

            case "pending_creation": {
                this.updateDropTarget(e);
                this.emitInteractionFrame();
                break;
            }
        }
        this.lastMousePos = { x: clientX, y: clientY };
        return { dx, dy };
    }

    private handleMouseUp = (_e: React.MouseEvent) => {
        if (this.mode === "dragging" && this.draggingNodeId && this.baseNode.targetId) {
            const targetNodeId = this.baseNode.targetId;
            const movingNodeId = this.draggingNodeId;
            const direction = this.baseNode.direction;

            const isDroppingOnItseltOrDescendant = this.dragSubtreeIds?.has(targetNodeId);

            if (!isDroppingOnItseltOrDescendant && direction) {
                const targetNode = this.container.safeGetNode(targetNodeId);

                if (targetNode) {
                    const side =
                        direction === "child" && targetNode.type === "root"
                            ? (this.baseNode.side ?? "right")
                            : undefined;

                    this.onMoveNode(targetNodeId, movingNodeId, direction, side);
                }
            }
        }

        const shouldUpdateReact = this.mode === "dragging";

        this.clearStatus();

        if (shouldUpdateReact) {
            this.emitDragSession();
            this.emitInteractionFrame();
        }
    };
    /** 스냅샷 생성은 여기에서만 (캐시 갱신 시점 통제) */
    private commitInteractionSnapshot() {
        this.interactionSnapshot = {
            mode: this.mode,
            draggingNodeId: this.draggingNodeId,
            dragDelta: this.dragDelta,
            mousePos: this.mousePos,
            dragSubtreeIds: this.dragSubtreeIds,
            baseNode: this.baseNode,
        };
    }

    private commitDragSessionSnapshot() {
        this.dragSessionSnapshot = {
            isDragging: this.mode === "dragging",
            draggingNodeId: this.draggingNodeId,
            dragSubtreeIds: this.dragSubtreeIds,
        };
    }

    /** 드래그 프레임(마우스 move 등)용 업데이트: InteractionLayer만 리렌더되도록 */
    private emitInteractionFrame() {
        this.commitInteractionSnapshot();
        this.broker.publish("INTERACTION_FRAME", undefined);
    }

    /** 드래그 세션 시작/종료(1회)용 업데이트: 원본 노드 ghost 처리 등에 사용 */
    private emitDragSession() {
        this.commitDragSessionSnapshot();
        this.broker.publish("DRAG_SESSION", undefined);
    }
    getInteractionSnapshot(): InteractionSnapshot {
        return this.interactionSnapshot;
    }

    getDragSessionSnapshot(): DragSessionSnapshot {
        return this.dragSessionSnapshot;
    }

    getSelectedNodeId() {
        return this.selectedNodeId;
    }
    // 새로운 노드 추가 TODO: 외부에서 버튼 클릭 시 이 모드가 되어야 함
    startCreating() {
        this.mode = "pending_creation";
    }

    getInteractionMode() {
        return this.mode;
    }
}
