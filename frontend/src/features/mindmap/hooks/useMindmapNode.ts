import { useMindmapNode as useEngineNode } from "@/features/mindmap/engine/hooks";
import type { NodeId } from "@/features/mindmap/types/node";

export const useMindMapNode = (nodeId: NodeId) => {
    return useEngineNode(nodeId);
};
