import { NodeDirection, NodeId } from "@/features/mindmap/types/node";

export type InteractionMode = "idle" | "potential_drag" | "dragging" | "panning" | "pending_creation";

export type BaseNodeInfo = {
    targetId: NodeId | null;
    direction?: NodeDirection | null;
};

export type InteractionStatus = {
    mode: InteractionMode;
    draggingNodeId: NodeId | null;
    dragDelta: { x: number; y: number };
    mousePos: { x: number; y: number };
    dragSubtreeIds: Set<NodeId> | null;
    baseNode: BaseNodeInfo;
};

export type InteractionSnapshot = {
    mode: InteractionMode;
    draggingNodeId: NodeId | null;
    dragDelta: { x: number; y: number };
    mousePos: { x: number; y: number };
    dragSubtreeIds: Set<NodeId> | null;
    baseNode: BaseNodeInfo;
};

export type DragSessionSnapshot = {
    isDragging: boolean;
    draggingNodeId: NodeId | null;
    dragSubtreeIds: Set<NodeId> | null;
};

export const EMPTY_INTERACTION_SNAPSHOT: InteractionSnapshot = {
    mode: "idle",
    draggingNodeId: null,
    dragDelta: { x: 0, y: 0 },
    mousePos: { x: 0, y: 0 },
    dragSubtreeIds: null,
    baseNode: { targetId: null, direction: null },
};

export const EMPTY_DRAG_SESSION_SNAPSHOT: DragSessionSnapshot = {
    isDragging: false,
    draggingNodeId: null,
    dragSubtreeIds: null,
};
