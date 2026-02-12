import { createContext } from "react";

import MindMapCore from "@/features/mindmap/core/MindMapCore";
import { NodeDirection, NodeId } from "@/features/mindmap/types/node";

export type MindMapRefContextType = {
    core: MindMapCore;
    actions: {
        addNode: (baseId: NodeId, dir: NodeDirection) => void;
        deleteNode: (nodeId: NodeId) => void;
        moveNode: (targetId: NodeId, movingId: NodeId, dir: NodeDirection) => void;
        updateNodeSize: (nodeId: NodeId, w: number, h: number) => void;
    };
};

export type MindMapStateContextType = {
    version: number;
};

export const MindMapRefContext = createContext<MindMapRefContextType | null>(null);
export const MindMapStateContext = createContext<MindMapStateContextType | null>(null);
