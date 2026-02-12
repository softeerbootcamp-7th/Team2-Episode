import { MOUSE_DOWN } from "@/constants/mouse";
import { ATTRIBUTE_NAME_OF_NODE_ID } from "@/features/mindmap/constants/node";
import { BaseNodeInfo, InteractionMode } from "@/features/mindmap/types/interaction";
import { NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { ViewportTransform } from "@/features/mindmap/types/spatial";
import TreeContainer from "@/features/mindmap/utils/TreeContainer";
import { calcDistance } from "@/utils/calc_distance";

const DRAG_THRESHOLD = 5;
const BASE_NODE_DETECTION_THRESHOLD = 100;

export class MindmapInteractionManager {
    private container: TreeContainer;
    private onUpdate: () => void;
    private onPan: (dx: number, dy: number) => void;
    private onMoveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection) => void;

    private mode: InteractionMode = "idle";
    private transform: ViewportTransform = { x: 0, y: 0, scale: 1 };

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

    constructor(
        container: TreeContainer,
        onUpdate: () => void,
        onPan: (dx: number, dy: number) => void,
        onMoveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection) => void,
    ) {
        this.container = container;
        this.onUpdate = onUpdate;
        this.onPan = onPan;
        this.onMoveNode = onMoveNode;
    }

    private projectScreenToWorld(clientX: number, clientY: number) {
        return {
            x: (clientX - this.transform.x) / this.transform.scale,
            y: (clientY - this.transform.y) / this.transform.scale,
        };
    }

    private calculateDropDirection(mouseY: number, targetNode: NodeElement): NodeDirection {
        if (targetNode.type === "root") {
            return "child";
        }

        if (!targetNode.firstChildId) {
            return "child";
        }

        if (mouseY < targetNode.y) {
            return "prev";
        } else {
            return "next";
        }
    }

    /** 마우스 위치를 기반으로 드래그 중인 노드가 어디에 어느 방향으로 드롭될지 실시간 계산, 상태 반영 */
    private updateDropTarget(e: React.MouseEvent) {
        // 드래그 중이거나 노드 생성 중일 때만 타겟 계산 수행
        if (this.mode !== "dragging" && this.mode !== "pending_creation") {
            return;
        }

        const { x: mouseX, y: mouseY } = this.projectScreenToWorld(e.clientX, e.clientY);

        let minDist = Infinity;
        let nearestId: NodeId | null = null;

        // 가장 가까운 노드 후보군 탐색
        // TODO: 쿼드 트리 적용
        for (const [id, node] of this.container.nodes) {
            if (this.mode === "dragging" && this.dragSubtreeIds?.has(id)) continue;

            const dist = calcDistance(node.x, node.y, mouseX, mouseY);
            if (dist < minDist && dist < BASE_NODE_DETECTION_THRESHOLD) {
                minDist = dist;
                nearestId = id;
            }
        }

        // 실시간 targetId, direction 반영
        if (nearestId) {
            const targetNode = this.container.safeGetNode(nearestId);

            if (targetNode) {
                this.baseNode.targetId = nearestId;
                this.baseNode.direction = this.calculateDropDirection(mouseY, targetNode);
            }
        } else {
            // 근처에 노드가 아예 없다면 고스트 정보 한번에 비우기
            this.baseNode = {
                targetId: null,
                direction: null,
            };
        }
    }

    private clearStatus() {
        this.mode = "idle";
        this.draggingNodeId = null;
        this.dragDelta = { x: 0, y: 0 };
        this.dragSubtreeIds = null;

        this.baseNode.targetId = null;
    }

    setTransform(transform: ViewportTransform) {
        this.transform = transform;
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

    handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== MOUSE_DOWN.left) {
            return;
        }

        this.startMousePos = { x: e.clientX, y: e.clientY };
        this.lastMousePos = { x: e.clientX, y: e.clientY };

        // TODO:
        const targetEl = (e.target as HTMLElement).closest(`[${ATTRIBUTE_NAME_OF_NODE_ID}]`);
        const nodeId = targetEl?.getAttribute(ATTRIBUTE_NAME_OF_NODE_ID);

        if (nodeId) {
            const node = this.container.safeGetNode(nodeId);
            if (!node || node.type === "root") {
                return;
            }

            this.draggingNodeId = nodeId;
            this.mode = "potential_drag";
            this.dragDelta = { x: 0, y: 0 };
        } else {
            this.mode = "panning";
        }
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
                if (e.buttons === MOUSE_DOWN.left) {
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
                // 월드 좌표 기준 이동량 계산
                const worldDx = dx / this.transform.scale;
                const worldDy = dy / this.transform.scale;

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

        this.clearStatus();
        this.onUpdate();
    };

    // 새로운 노드 추가 TODO: 외부에서 버튼 클릭 시 이 모드가 되어야 함
    public startCreating = () => {
        this.mode = "pending_creation";
    };
}
