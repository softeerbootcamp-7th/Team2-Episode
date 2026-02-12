import { NodeDirection, NodeId } from "@/features/mindmap/types/node";

export type InteractionMode = "idle" | "potential_drag" | "dragging" | "panning" | "pending_creation";

export type BaseNodeInfo = {
    targetId: NodeId | null;
    direction?: NodeDirection | null;
};
