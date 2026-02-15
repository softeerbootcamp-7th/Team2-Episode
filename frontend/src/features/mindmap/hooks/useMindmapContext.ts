import { useCallback, useContext, useSyncExternalStore } from "react";

import { MindMapRefContext, MindMapStateContext } from "@/features/mindmap/providers/MindmapContext";
import { EMPTY_DRAG_SESSION_SNAPSHOT, EMPTY_INTERACTION_SNAPSHOT } from "@/features/mindmap/types/interaction";

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

/**
 * 드래그/상호작용 프레임 전용 (마우스 move마다 발생)
 * - Static 노드/Edge 렌더 트리와 분리된 컴포넌트(InteractionLayer 등)에서만 사용해야 함
 */
export const useMindMapInteractionFrame = () => {
    const context = useContext(MindMapRefContext);
    if (!context) throw new Error("Provider missing!");

    const { core } = context;

    const subscribe = useCallback(
        (onStoreChange: () => void) =>
            core.getBroker().subscribe({ key: "INTERACTION_FRAME", callback: onStoreChange }),
        [core],
    );

    return useSyncExternalStore(subscribe, () => core.getInteractionSnapshot() ?? EMPTY_INTERACTION_SNAPSHOT);
};

/**
 * 드래그 세션 전용 (start/end에만 발생)
 * - 원본 노드를 흐리게(ghost) 처리하는 스타일 주입 등에 사용
 */
export const useMindMapDragSession = () => {
    const context = useContext(MindMapRefContext);
    if (!context) throw new Error("Provider missing!");

    const { core } = context;

    const subscribe = useCallback(
        (onStoreChange: () => void) => core.getBroker().subscribe({ key: "DRAG_SESSION", callback: onStoreChange }),
        [core],
    );

    return useSyncExternalStore(subscribe, () => core.getDragSessionSnapshot() ?? EMPTY_DRAG_SESSION_SNAPSHOT);
};
