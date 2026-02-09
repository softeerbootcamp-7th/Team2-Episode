import { MOUSE_DOWN } from "@/constants/mouse";
import { ATTRIBUTE_NAME_OF_NODE_ID } from "@/features/mindmap/constants/node";
import { BaseNodeInfo, InteractionMode, ViewportTransform } from "@/features/mindmap/types/mindmap_interaction_type";
import { NodeId } from "@/features/mindmap/types/mindmapType";
import TreeContainer from "@/features/mindmap/utils/TreeContainer";
import { calcDistance } from "@/utils/calc_distance";

const DRAG_THRESHOLD = 5;
const BASE_NODE_DETECTION_THRESHOLD = 100;

export class MindmapInteractionManager {
    private container: TreeContainer;
    private onUpdate: () => void;
    private onPan: (dx: number, dy: number) => void;
    private onMoveNode: (targetId: NodeId, movingId: NodeId) => void;

    private mode: InteractionMode = "idle";
    private transform: ViewportTransform = { x: 0, y: 0, scale: 1 };

    private startMousePos = { x: 0, y: 0 };
    private lastMousePos = { x: 0, y: 0 };

    private draggingNodeId: NodeId | null = null;
    private dragDelta = { x: 0, y: 0 };

    private dragSubtreeIds: Set<NodeId> | null = null;

    private baseNode: BaseNodeInfo = {
        targetId: null,
    };

    constructor(
        container: TreeContainer,
        onUpdate: () => void,
        onPan: (dx: number, dy: number) => void,
        onMoveNode: (targetId: NodeId, movingId: NodeId) => void,
    ) {
        this.container = container;
        this.onUpdate = onUpdate;
        this.onPan = onPan;
        this.onMoveNode = onMoveNode;
    }

    public setTransform(transform: ViewportTransform) {
        this.transform = transform;
    }

    public getInteractionStatus() {
        return {
            mode: this.mode,
            draggingNodeId: this.draggingNodeId,
            dragDelta: this.dragDelta,
            dragSubtreeIds: this.dragSubtreeIds,
            baseNode: this.baseNode,
        };
    }

    private projectScreenToWorld(clientX: number, clientY: number) {
        return {
            x: (clientX - this.transform.x) / this.transform.scale,
            y: (clientY - this.transform.y) / this.transform.scale,
        };
    }

    public handleMouseDown = (e: React.MouseEvent) => {
        // 좌클릭 아니면 무시
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

    public handleMouseMove = (e: React.MouseEvent) => {
        const clientX = e.clientX;
        const clientY = e.clientY;

        switch (this.mode) {
            case "idle":
                break;

            case "panning": {
                const dx = clientX - this.lastMousePos.x;
                const dy = clientY - this.lastMousePos.y;

                this.onPan(dx, dy);
                this.lastMousePos = { x: clientX, y: clientY };

                break;
            }

            case "potential_drag": {
                const dist = calcDistance(clientX, clientY, this.startMousePos.x, this.startMousePos.y);
                if (dist > DRAG_THRESHOLD) {
                    this.mode = "dragging";

                    if (this.draggingNodeId) {
                        this.dragSubtreeIds = this.container.getAllDescendantIds(this.draggingNodeId);
                    }

                    this.onUpdate();
                }

                break;
            }

            case "dragging": {
                if (!this.draggingNodeId) {
                    return;
                }

                const dx = (clientX - this.lastMousePos.x) / this.transform.scale;
                const dy = (clientY - this.lastMousePos.y) / this.transform.scale;

                this.dragDelta = {
                    x: this.dragDelta.x + dx,
                    y: this.dragDelta.y + dy,
                };

                this.calcBaseNode(e);

                this.lastMousePos = { x: clientX, y: clientY };
                this.onUpdate();

                break;
            }
        }
    };

    private calcBaseNode(e: React.MouseEvent) {
        if (!this.draggingNodeId) {
            return;
        }

        const worldPos = this.projectScreenToWorld(e.clientX, e.clientY);
        const checkX = worldPos.x;
        const checkY = worldPos.y;

        let minDist = Infinity;
        let nearestId: NodeId | null = null;

        for (const [id, node] of this.container.nodes) {
            if (id === this.draggingNodeId) continue;

            const dist = calcDistance(node.x, node.y, checkX, checkY);
            if (dist < minDist && dist < BASE_NODE_DETECTION_THRESHOLD) {
                minDist = dist;
                nearestId = id;
            }
        }

        this.baseNode.targetId = nearestId;
    }

    public handleMouseUp = (_e: React.MouseEvent) => {
        if (this.mode === "dragging" && this.draggingNodeId && this.baseNode.targetId) {
            if (this.baseNode.targetId !== this.draggingNodeId) {
                this.onMoveNode(this.baseNode.targetId, this.draggingNodeId);
            }
        }

        this.clearStatus();

        this.onUpdate();
    };

    private clearStatus() {
        this.mode = "idle";
        this.draggingNodeId = null;
        this.dragDelta = { x: 0, y: 0 };
        this.dragSubtreeIds = null;

        this.baseNode.targetId = null;
    }
}
