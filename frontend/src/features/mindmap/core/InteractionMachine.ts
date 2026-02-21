import { TEMP_NEW_NODE_ID } from "@/features/mindmap/constants/node";
import type {
    BaseNodeInfo,
    DragSessionSnapshot,
    InteractionMode,
    InteractionSnapshot,
} from "@/features/mindmap/types/mindmap_interaction";
import { EMPTY_DRAG_SESSION_SNAPSHOT, EMPTY_INTERACTION_SNAPSHOT } from "@/features/mindmap/types/mindmap_interaction";
import type { AddNodeDirection, NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { calcDistance } from "@/utils/calc_distance";

const DEFAULT_DRAG_THRESHOLD = 5;

export type HitResult = { kind: "node"; nodeId: NodeId } | { kind: "canvas" };

type Deps = {
    getRootNode: () => NodeElement;
    getChildNodes: (parentId: NodeId) => NodeElement[];
    getAllDescendantIds: (nodeId: NodeId) => Set<NodeId>;
    safeGetNode: (nodeId: NodeId) => NodeElement | undefined;

    screenToWorld: (x: number, y: number) => { x: number; y: number };

    onPan: (dx: number, dy: number) => void;
    onMoveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection, side?: AddNodeDirection) => void;
    onDeleteNode: (nodeId: NodeId) => void;
    onSelectNode: (nodeId: NodeId | null) => void;

    emitInteraction: (snap: InteractionSnapshot) => void;
    emitDragSession: (snap: DragSessionSnapshot) => void;

    dragThreshold?: number;
};

export class InteractionMachine {
    private mode: InteractionMode = "idle";
    private startMousePos = { x: 0, y: 0 };
    private lastMousePos = { x: 0, y: 0 };
    private draggingNodeId: NodeId | null = null;
    private dragDelta = { x: 0, y: 0 };
    private mousePos = { x: 0, y: 0 };
    private dragSubtreeIds: Set<NodeId> | null = null;

    private baseNode: BaseNodeInfo = { targetId: null, direction: null, side: null };
    private selectedNodeId: NodeId | null = null;

    private interactionSnapshot: InteractionSnapshot = EMPTY_INTERACTION_SNAPSHOT;
    private dragSessionSnapshot: DragSessionSnapshot = EMPTY_DRAG_SESSION_SNAPSHOT;

    private dragThreshold: number;

    constructor(private deps: Deps) {
        this.dragThreshold = deps.dragThreshold ?? DEFAULT_DRAG_THRESHOLD;
        this.commitInteractionSnapshot();
        this.commitDragSessionSnapshot();
        this.deps.emitInteraction(this.interactionSnapshot);
        this.deps.emitDragSession(this.dragSessionSnapshot);
    }

    pointerDown(hit: HitResult, e: { clientX: number; clientY: number; button?: number; buttons?: number }) {
        if (this.mode === "pending_creation") return;

        if (hit.kind === "node") {
            this.selectedNodeId = hit.nodeId;
            this.deps.onSelectNode(hit.nodeId);

            const node = this.deps.safeGetNode(hit.nodeId);
            if (!node || node.type === "root") return;

            this.draggingNodeId = hit.nodeId;
            this.mode = "potential_drag";
            this.startMousePos = { x: e.clientX, y: e.clientY };
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.dragDelta = { x: 0, y: 0 };
            return;
        }

        // canvas
        this.selectedNodeId = null;
        this.deps.onSelectNode(null);

        const isPanningButton = e.button === 0 || e.button === 1 || e.button === 2;
        if (!isPanningButton) return;

        this.startMousePos = { x: e.clientX, y: e.clientY };
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.mode = "panning";
    }

    pointerMove(e: { clientX: number; clientY: number; buttons?: number }) {
        const clientX = e.clientX;
        const clientY = e.clientY;

        const dx = clientX - this.lastMousePos.x;
        const dy = clientY - this.lastMousePos.y;

        const world = this.deps.screenToWorld(clientX, clientY);
        this.mousePos = world;

        switch (this.mode) {
            case "idle":
                break;

            case "panning":
                if ((e.buttons ?? 0) > 0) this.deps.onPan(dx, dy);
                break;

            case "potential_drag": {
                const dist = calcDistance(clientX, clientY, this.startMousePos.x, this.startMousePos.y);
                if (dist > this.dragThreshold) {
                    this.mode = "dragging";

                    if (this.draggingNodeId) {
                        this.dragSubtreeIds = this.deps.getAllDescendantIds(this.draggingNodeId);
                    }

                    this.emitDragSession();
                    this.emitInteractionFrame();
                }
                break;
            }

            case "dragging": {
                const prevWorld = this.deps.screenToWorld(this.lastMousePos.x, this.lastMousePos.y);
                const nextWorld = world;

                const worldDx = nextWorld.x - prevWorld.x;
                const worldDy = nextWorld.y - prevWorld.y;

                this.dragDelta = { x: this.dragDelta.x + worldDx, y: this.dragDelta.y + worldDy };

                this.updateDropTarget(clientX, clientY);
                this.emitInteractionFrame();
                break;
            }

            case "pending_creation": {
                this.updateDropTarget(clientX, clientY);
                this.emitInteractionFrame();
                break;
            }
        }

        this.lastMousePos = { x: clientX, y: clientY };
        return { dx, dy };
    }

    pointerUp() {
        const isDragging = this.mode === "dragging";
        const isCreating = this.mode === "pending_creation";

        if ((isCreating || isDragging) && this.baseNode.targetId && this.baseNode.direction) {
            const targetId = this.baseNode.targetId;
            const direction = this.baseNode.direction;

            const movingId: NodeId | null = isDragging ? this.draggingNodeId : TEMP_NEW_NODE_ID;
            if (movingId) {
                const droppingOnDescendant = isDragging ? !!this.dragSubtreeIds?.has(targetId) : false;
                if (!droppingOnDescendant) {
                    const targetNode = this.deps.safeGetNode(targetId);
                    if (targetNode) {
                        const side =
                            direction === "child" && targetNode.type === "root"
                                ? (this.baseNode.side ?? "right")
                                : undefined;

                        this.deps.onMoveNode(targetId, movingId, direction, side);
                    }
                }
            }
        }

        const shouldUpdate = isDragging || isCreating;
        this.clearStatus();

        if (shouldUpdate) {
            this.emitDragSession();
            this.emitInteractionFrame();
        }
    }

    deleteSelected() {
        if (!this.selectedNodeId) return;
        this.deps.onDeleteNode(this.selectedNodeId);
        this.selectedNodeId = null;
        this.deps.onSelectNode(null);
    }

    private updateDropTarget(clientX: number, clientY: number) {
        if (this.mode !== "dragging" && this.mode !== "pending_creation") return;

        const { x: mouseX, y: mouseY } = this.deps.screenToWorld(clientX, clientY);

        const isDragging = this.mode === "dragging";
        const isExcluded = (id: NodeId) => isDragging && !!this.dragSubtreeIds && this.dragSubtreeIds.has(id);

        let parentNode: NodeElement = this.deps.getRootNode();

        let side: AddNodeDirection = mouseX < parentNode.x ? "left" : "right";

        let depthGuard = 0;

        while (depthGuard++ < 20) {
            let childrenForBand = this.deps.getChildNodes(parentNode.id);

            if (parentNode.type === "root") {
                childrenForBand = childrenForBand.filter((c) => c.addNodeDirection === side);
            }

            childrenForBand = childrenForBand.filter((c) => !isExcluded(c.id));

            if (childrenForBand.length === 0) {
                this.baseNode = { targetId: parentNode.id, direction: "child", side };
                return;
            }

            const parentW = parentNode.width || 200;
            const parentWallX = side === "right" ? parentNode.x + parentW / 2 : parentNode.x - parentW / 2;

            let outerWallX = parentWallX;

            for (const child of childrenForBand) {
                const cw = child.width || 200;
                const childEdgeX = side === "right" ? child.x + cw / 2 : child.x - cw / 2;
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

            if (parentNode.type === "root") {
                side = mouseX < parentNode.x ? "left" : "right";
            } else {
                side = parentNode.addNodeDirection;
            }
        }

        let children = this.deps.getChildNodes(parentNode.id);

        if (parentNode.type === "root") {
            children = children.filter((c) => c.addNodeDirection === side);
        }

        children = children.filter((c) => !isExcluded(c.id));

        if (children.length === 0) {
            this.baseNode = { targetId: parentNode.id, direction: "child", side };
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
            this.baseNode = { targetId: ordered[0]!.id, direction: "prev", side };
            return;
        }

        if (insertIndex >= ordered.length) {
            this.baseNode = { targetId: ordered[ordered.length - 1]!.id, direction: "next", side };
            return;
        }

        this.baseNode = { targetId: ordered[insertIndex]!.id, direction: "prev", side };
    }

    private clearStatus() {
        this.mode = "idle";
        this.draggingNodeId = null;
        this.dragDelta = { x: 0, y: 0 };
        this.dragSubtreeIds = null;
        this.baseNode = { targetId: null, direction: null, side: null };
    }

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

    private emitInteractionFrame() {
        this.commitInteractionSnapshot();
        this.deps.emitInteraction(this.interactionSnapshot);
    }

    private emitDragSession() {
        this.commitDragSessionSnapshot();
        this.deps.emitDragSession(this.dragSessionSnapshot);
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

    startCreating() {
        this.mode = "pending_creation";
        this.draggingNodeId = null;
        this.dragDelta = { x: 0, y: 0 };
        this.dragSubtreeIds = null;
        this.baseNode = { targetId: null, direction: null, side: null };

        this.emitDragSession();
        this.emitInteractionFrame();
    }

    cancel() {
        if (this.mode === "idle") return;
        this.clearStatus();
        this.emitDragSession();
        this.emitInteractionFrame();
    }

    getInteractionMode() {
        return this.mode;
    }
}
