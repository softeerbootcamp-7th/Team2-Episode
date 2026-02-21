import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useMindmapControllerContext } from "@/features/mindmap/core/MindmapProvider";
import { useMindmapControllerEvents } from "@/features/mindmap/hooks/useMindmapEngineEvents";
import { LockInfo } from "@/features/mindmap/types/mindmap_collaboration";
import type { NodeId } from "@/features/mindmap/types/node";
import { MindmapStoreState, StoreChannel } from "@/features/mindmap/utils/mindmap_store";

/** context로 뿌리고 있는 엔진 인스턴스 접근 */

/** 엔진 actions */
export function useMindmapActions() {
    const engine = useMindmapControllerContext();
    return engine.actions;
}

/**
 * 채널 + selector 기반 구독
 * - channel: 어떤 타입의 변화에 반응할지 (graph / viewport / node:xxx ...)
 * - selector: state에서 내가 필요한 조각만 뽑기
 */
export function useMindmapChannel<T>(channel: StoreChannel, selector: (s: MindmapStoreState) => T): T {
    const engine = useMindmapControllerContext();
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

export function useMindmapNode(nodeId: NodeId) {
    const channel = `node:${nodeId}` as const;
    return useMindmapChannel(channel, (s) => s.graph.nodes.get(nodeId));
}

export function useViewportEvents() {
    useMindmapControllerEvents();
}

export function useMindmapParticipants() {
    return useMindmapChannel("collaborators", (s) => s.collaborators.participants);
}

export function useMindmapRemoteCursors() {
    return useMindmapChannel("cursors", (s) => s.cursors.cursors);
}

export function useMindmapSelfLockedNodeId() {
    return useMindmapChannel("locks", (s) => s.locks.selfLockedNodeId);
}

export function useMindmapNodeLockInfo(nodeId: NodeId): LockInfo | null {
    const channel = `lock:${nodeId}` as const;
    return useMindmapChannel(channel, (s) => s.locks.byNodeId.get(nodeId) ?? null);
}

export function useMindmapSelfClientId() {
    return useMindmapChannel("locks", (s) => s.locks.selfClientId);
}

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
