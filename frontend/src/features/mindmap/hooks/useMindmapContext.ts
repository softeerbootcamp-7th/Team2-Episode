import { useContext } from "react";

import { MindMapRefContext, MindMapStateContext } from "@/features/mindmap/providers/MindmapContext";

export const useMindMapActions = () => {
    const context = useContext(MindMapRefContext);
    if (!context) throw new Error("Provider missing!");
    return context.actions;
};

export const useMindMapCore = () => {
    const context = useContext(MindMapRefContext);

    if (context === undefined) {
        throw new Error("useMindMapCore must be used within a MindMapProvider");
    }

    return context?.core;
};

export const useMindMapVersion = () => {
    const context = useContext(MindMapStateContext);
    if (!context) throw new Error("Provider missing!");
    return context.version;
};
