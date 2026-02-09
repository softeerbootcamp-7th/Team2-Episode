import { NodeId } from "@/features/mindmap/types/mindmapType";

export type InteractionMode = "idle" | "potential_drag" | "dragging" | "panning";

export type ViewportTransform = {
    x: number;
    y: number;
    scale: number;
};

export interface BaseNodeInfo {
    targetId: NodeId | null;
}
