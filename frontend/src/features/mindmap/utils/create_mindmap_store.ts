import { CursorsSlice, PresenceSlice } from "@/features/mindmap/engine/types";
import { DragSessionSnapshot, InteractionSnapshot } from "@/features/mindmap/types/interaction";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

export type MindmapStoreState = {
    ready: boolean;
    graph: {
        rootId: NodeId;
        nodes: Map<NodeId, NodeElement>;
        revision: number;
    };
    selection: {
        selectedNodeId: NodeId | null;
    };
    viewport: {
        x: number;
        y: number;
        scale: number;
    };
    interaction: InteractionSnapshot;
    dragSession: DragSessionSnapshot;

    presence: PresenceSlice;
    cursors: CursorsSlice;
};

type Listener = () => void;
type Unsubscribe = () => void;

export type StoreChannel = "graph" | "viewport" | "interaction" | "dragSession" | `node:${string}`;

export interface MindmapStore {
    getState(): MindmapStoreState;
    setState(updater: (prev: MindmapStoreState) => MindmapStoreState, notify: { channels?: StoreChannel[] }): void;
    subscribe(channel: StoreChannel, listener: Listener): Unsubscribe;
}

export function createMindmapStore(initial: MindmapStoreState): MindmapStore {
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

    return {
        getState: () => state,
        setState: (updater, notify) => {
            const next = updater(state);
            if (Object.is(next, state)) return;
            state = next;
            const channels = notify.channels ?? [];
            for (const ch of channels) {
                const set = listeners.get(ch);
                if (!set) continue;
                for (const l of set) l();
            }
        },
        subscribe: (channel, listener) => {
            const set = getSet(channel);
            set.add(listener);
            return () => set.delete(listener);
        },
    };
}
