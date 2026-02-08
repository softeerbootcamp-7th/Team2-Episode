import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { NodeId } from "@/features/mindmap/types/mindmapType";
import MindmapLayoutManager from "@/features/mindmap/utils/MindmapLayoutManager";
import TreeContainer from "@/features/mindmap/utils/TreeContainer";
import { EventBroker } from "@/utils/EventBroker";

type MindMapRefContextType = {
    container: TreeContainer;
    broker: EventBroker<NodeId>;
    actions: {
        addNode: (parentId: NodeId) => void;
        deleteNode: (nodeId: NodeId) => void;
        moveNode: (targetId: NodeId, movingId: NodeId) => void;
        updateNodeSize: (nodeId: NodeId, width: number, height: number) => void;
        forceLayout: () => void;
    };
};

type MindMapStateContextType = {
    version: number;
};

const MindMapRefContext = createContext<MindMapRefContextType | null>(null);
const MindMapStateContext = createContext<MindMapStateContextType | null>(null);

export const MindMapProvider = ({ children }: { children: React.ReactNode }) => {
    const storeRef = useRef<{
        container: TreeContainer;
        broker: EventBroker<NodeId>;
        layoutManager: MindmapLayoutManager;
    } | null>(null);

    const [version, setVersion] = useState(0);

    if (!storeRef.current) {
        const broker = new EventBroker<NodeId>();
        const container = new TreeContainer({ broker, quadTreeManager: undefined });
        const layoutManager = new MindmapLayoutManager({ treeContainer: container });
        storeRef.current = { container, broker, layoutManager };
    }

    const { container, broker, layoutManager } = storeRef.current;

    const actions = useMemo(
        () => ({
            addNode: (parentId: NodeId) => {
                container.appendChild({ parentNodeId: parentId });
                layoutManager.invalidate(parentId);
                const rootId = container.getRootId();
                if (rootId) layoutManager.updateLayout({ rootId });
                setVersion((v) => v + 1);
            },
            deleteNode: (nodeId: NodeId) => {
                const parentId = container.getParentId(nodeId);
                container.delete({ nodeId });
                if (parentId) {
                    layoutManager.invalidate(parentId);
                    const rootId = container.getRootId();
                    if (rootId) layoutManager.updateLayout({ rootId });
                }
                setVersion((v) => v + 1);
            },
            updateNodeSize: (nodeId: NodeId, width: number, height: number) => {
                const node = container.safeGetNode(nodeId);
                if (node && (node.width !== width || node.height !== height)) {
                    container.update({ nodeId, newNodeData: { width, height } });
                    layoutManager.invalidate(nodeId);
                    const rootId = container.getRootId();
                    if (rootId) layoutManager.updateLayout({ rootId });
                    setVersion((v) => v + 1);
                }
            },
            moveNode: (targetId: NodeId, movingId: NodeId) => {
                const oldParentId = container.getParentId(movingId);
                container.moveTo({ baseNodeId: targetId, movingNodeId: movingId, direction: "child" });
                layoutManager.invalidate(targetId);
                if (oldParentId) layoutManager.invalidate(oldParentId);
                const rootId = container.getRootId();
                if (rootId) layoutManager.updateLayout({ rootId });
                setVersion((v) => v + 1);
            },
            forceLayout: () => {
                const rootId = container.getRootId();
                if (rootId) layoutManager.updateLayout({ rootId });
                setVersion((v) => v + 1);
            },
        }),
        [container, broker, layoutManager],
    );

    const refValue = useMemo(() => ({ container, broker, actions }), [container, broker, actions]);
    const stateValue = useMemo(() => ({ version }), [version]);

    return (
        <MindMapRefContext.Provider value={refValue}>
            <MindMapStateContext.Provider value={stateValue}>{children}</MindMapStateContext.Provider>
        </MindMapRefContext.Provider>
    );
};

export const useNode = (nodeId: NodeId) => {
    const context = useContext(MindMapRefContext);
    if (!context) throw new Error("Provider missing!");
    const { container, broker } = context;

    const subscribe = useCallback(
        (onStoreChange: () => void) => broker.subscribe({ key: nodeId, callback: onStoreChange }),
        [broker, nodeId],
    );

    const getSnapshot = useCallback(() => container.safeGetNode(nodeId), [container, nodeId]);

    return useSyncExternalStore(subscribe, getSnapshot);
};

export const useMindmapActions = () => {
    const context = useContext(MindMapRefContext);

    if (!context) throw new Error("Provider missing!");

    return context.actions;
};

export const useMindmapContainer = () => {
    const context = useContext(MindMapRefContext);
    if (!context) throw new Error("Provider missing!");
    return context.container;
};

export const useMindmapVersion = () => {
    const context = useContext(MindMapStateContext);
    if (!context) throw new Error("Provider missing!");
    return context.version;
};
