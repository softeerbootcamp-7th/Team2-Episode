import { useCallback, useContext, useSyncExternalStore } from "react";

import { MindMapRefContext } from "@/features/mindmap/providers/MindmapContext";
import { NodeId } from "@/features/mindmap/types/node";

export const useMindMapNode = (nodeId: NodeId) => {
    const context = useContext(MindMapRefContext);
    if (!context) throw new Error("MindMapProvider missing!");

    const { core } = context;
    const subscribe = useCallback(
        (onStoreChange: () => void) => core.getBroker().subscribe({ key: nodeId, callback: onStoreChange }),
        [core, nodeId],
    );

    return useSyncExternalStore(subscribe, () => core.getTree().safeGetNode(nodeId));
};
