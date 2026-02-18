import type { Listener, MindmapState, MindmapStore, StoreChannel, Unsubscribe } from "@/features/mindmap/engine/types";

/**
 * 채널 기반 external store
 * - "node:xxx" / "interaction" / "viewport" 등 원하는 구독자만 깨울 수 있음
 */
export function createMindmapStore(initial: MindmapState): MindmapStore {
    let state = initial;

    const listeners = new Map<StoreChannel, Set<Listener>>();

    const getSet = (channel: StoreChannel) => {
        let set = listeners.get(channel);
        if (!set) {
            set = new Set();
            listeners.set(channel, set);
        }
        return set;
    };

    const notifyChannels = (channels: StoreChannel[]) => {
        // 실수로 같은 채널 여러 개 넣었을 때를 위해 중복 제거.
        const unique = new Set(channels);
        for (const ch of unique) {
            const set = listeners.get(ch);
            if (!set) continue;
            for (const fn of set) fn();
        }
    };

    return {
        getState: () => state,

        setState: (updater, notify) => {
            const next = updater(state);
            // 불변 체크
            if (Object.is(next, state)) return;

            state = next;

            const channels = notify?.channels ?? [];
            if (channels.length > 0) notifyChannels(channels);
        },

        subscribe: (channel: StoreChannel, listener: Listener): Unsubscribe => {
            const set = getSet(channel);
            set.add(listener);
            return () => set.delete(listener);
        },
    };
}

export const nodeChannel = (nodeId: string) => `node:${nodeId}` as const;
