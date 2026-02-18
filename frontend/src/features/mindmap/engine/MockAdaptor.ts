import { ROOT_NODE_ID } from "@/features/mindmap/engine/YjsAdaptor";
import type { NodeElement, NodeId } from "@/features/mindmap/types/node";

import type { AdapterChange, TreeAdapter } from "./types";

const ROOT_PARENT_ID = "empty";

type RootChildPointers = {
    firstChildIdLeft: NodeId | null;
    lastChildIdLeft: NodeId | null;
    firstChildIdRight: NodeId | null;
    lastChildIdRight: NodeId | null;
};
type RootNodeElement = NodeElement & { type: "root" } & RootChildPointers;

export class MockAdapter implements TreeAdapter {
    private cache = new Map<NodeId, NodeElement>();
    private listeners = new Set<(c: AdapterChange) => void>();

    private inTx = false;
    private changedInTx = new Set<NodeId>();
    private txOrigin: unknown = "mock";

    constructor(rootContents = "") {
        // root init
        const root: RootNodeElement = {
            id: ROOT_NODE_ID,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            addNodeDirection: "right",

            parentId: ROOT_PARENT_ID,
            firstChildId: null,
            lastChildId: null,
            nextId: null,
            prevId: null,

            data: { contents: rootContents },
            type: "root",

            firstChildIdLeft: null,
            lastChildIdLeft: null,
            firstChildIdRight: null,
            lastChildIdRight: null,
        };

        this.cache.set(ROOT_NODE_ID, root);
    }

    destroy(): void {
        this.listeners.clear();
    }

    onChange(cb: (change: AdapterChange) => void) {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    transact(fn: () => void, origin: unknown = "mock-tx"): void {
        this.inTx = true;
        this.txOrigin = origin;
        this.changedInTx.clear();

        fn();

        const changedIds = Array.from(this.changedInTx);
        this.inTx = false;

        if (changedIds.length > 0) {
            const change: AdapterChange = {
                changedIds,
                local: true,
                origin: this.txOrigin,
            };
            for (const l of this.listeners) l(change);
        }
    }

    getMap(): Map<NodeId, NodeElement> {
        return this.cache;
    }

    get(nodeId: NodeId): NodeElement | undefined {
        return this.cache.get(nodeId);
    }

    set(nodeId: NodeId, node: NodeElement): void {
        this.cache.set(nodeId, node);
        this.markChanged(nodeId);
    }

    delete(nodeId: NodeId): void {
        this.cache.delete(nodeId);
        this.markChanged(nodeId);
    }

    private markChanged(id: NodeId) {
        if (this.inTx) {
            this.changedInTx.add(id);
            return;
        }
        const change: AdapterChange = { changedIds: [id], local: true, origin: this.txOrigin };
        for (const l of this.listeners) l(change);
    }
}
