import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import { MindmapEngineContext } from "@/features/mindmap/engine/MindmapEngineContext";
import type { LockInfo, MindmapState, StoreChannel } from "@/features/mindmap/engine/types";
import { useMindmapEngineEvents } from "@/features/mindmap/engine/useMindmapEngineEvents";
import type { NodeId } from "@/features/mindmap/types/node";

/** context로 뿌리고 있는 엔진 인스턴스 접근 */
export function useMindmapEngineContext() {
    const engine = useContext(MindmapEngineContext);
    if (!engine) throw new Error("MindmapEngineProvider missing!");
    return engine;
}

/** 엔진 actions */
export function useMindmapActions() {
    const engine = useMindmapEngineContext();
    return engine.actions;
}

/**
 * 채널 + selector 기반 구독
 * - channel: 어떤 타입의 변화에 반응할지 (graph / viewport / node:xxx ...)
 * - selector: state에서 내가 필요한 조각만 뽑기
 */
export function useMindmapChannel<T>(channel: StoreChannel, selector: (s: MindmapState) => T): T {
    const engine = useMindmapEngineContext();
    const store = engine.getStore();

    const subscribe = useCallback((cb: () => void) => store.subscribe(channel, cb), [store, channel]);
    const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useMindmapReady() {
    return useMindmapChannel("graph", (s) => s.ready);
}

export function useMindmapGraphRevision() {
    return useMindmapChannel("graph", (s) => s.graph.revision);
}

export function useMindmapRootId() {
    return useMindmapChannel("graph", (s) => s.graph.rootId);
}

export function useMindmapSelection() {
    return useMindmapChannel("selection", (s) => s.selection.selectedNodeId);
}

export function useMindmapViewport() {
    return useMindmapChannel("viewport", (s) => s.viewport);
}

export function useMindmapInteraction() {
    return useMindmapChannel("interaction", (s) => s.interaction);
}

export function useMindmapDragSession() {
    return useMindmapChannel("dragSession", (s) => s.dragSession);
}

/** 노드 단위 구독: node:ID 채널만 깨움 */
export function useMindmapNode(nodeId: NodeId) {
    const channel = `node:${nodeId}` as const;
    return useMindmapChannel(channel, (s) => s.graph.nodes.get(nodeId));
}

export const useMindMapActions = () => useMindmapActions();

export const useMindMapVersion = () => useMindmapGraphRevision();

export const useMindMapInteractionFrame = () => useMindmapInteraction();

export const useMindMapDragSession = () => useMindmapDragSession();

export function useViewportEvents() {
    useMindmapEngineEvents();
}

export function useMindmapParticipants() {
    return useMindmapChannel("presence", (s) => s.presence.participants);
}

export function useMindmapRemoteCursors() {
    return useMindmapChannel("cursors", (s) => s.cursors.cursors);
}

export function useMindmapSelfLockedNodeId() {
    return useMindmapChannel("locks", (s) => s.locks.selfLockedNodeId);
}

// ✅ lock info 자체(원본 참조)만 selector에서 반환

export function useMindmapNodeLockInfo(nodeId: NodeId): LockInfo | null {
    const channel = `lock:${nodeId}` as const;
    return useMindmapChannel(channel, (s) => s.locks.byNodeId.get(nodeId) ?? null);
}

// ✅ selfClientId는 primitive라 안전
export function useMindmapSelfClientId() {
    return useMindmapChannel("locks", (s) => s.locks.selfClientId);
}

// ✅ 최종적으로 컴포넌트가 쓰기 편한 형태로 조립
export function useMindmapNodeLock(nodeId: NodeId) {
    const info = useMindmapNodeLockInfo(nodeId);
    const selfClientId = useMindmapSelfClientId();

    return useMemo(() => {
        if (!info) {
            return { locked: false as const, lockedByMe: false as const, info: null as LockInfo | null };
        }
        const lockedByMe = selfClientId != null && info.clientId === selfClientId;

        return { locked: true as const, lockedByMe, info };
    }, [info, selfClientId]);
}
