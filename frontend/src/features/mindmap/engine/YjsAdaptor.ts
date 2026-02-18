import * as Y from "yjs";

import { AdapterChange, TreeAdapter } from "@/features/mindmap/types/mindmap_controller";
import type { NodeElement, NodeId } from "@/features/mindmap/types/node";

export const ROOT_NODE_ID = "root";
const ROOT_PARENT_ID = "empty";

type Options = {
    doc: Y.Doc;
    roomId: string;
    rootContents?: string;
};

type RootChildPointers = {
    firstChildIdLeft: NodeId | null;
    lastChildIdLeft: NodeId | null;
    firstChildIdRight: NodeId | null;
    lastChildIdRight: NodeId | null;
};

type RootNodeElement = NodeElement & { type: "root" } & RootChildPointers;

export class YjsAdapter implements TreeAdapter {
    private doc: Y.Doc;
    private yNodes: Y.Map<NodeElement>;
    private cache = new Map<NodeId, NodeElement>();

    private listeners = new Set<(c: AdapterChange) => void>();
    private observeHandler: (e: Y.YMapEvent<NodeElement>) => void;

    constructor({ doc, roomId, rootContents = "" }: Options) {
        this.doc = doc;
        this.yNodes = this.doc.getMap<NodeElement>(roomId);

        this.yNodes.forEach((value, key) => {
            this.cache.set(key as NodeId, value);
        });

        const existingRoot = this.yNodes.get(ROOT_NODE_ID);
        if (!existingRoot) {
            this.doc.transact(() => {
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

                this.yNodes.set(ROOT_NODE_ID, root);
                this.cache.set(ROOT_NODE_ID, root);
            }, "init-root");
        } else {
            this.normalizeRoot(existingRoot);
        }

        this.observeHandler = (event) => {
            const changedIds: NodeId[] = Array.from(event.keysChanged) as NodeId[];

            for (const id of changedIds) {
                const next = this.yNodes.get(id);
                if (next === undefined) this.cache.delete(id);
                else this.cache.set(id, next);
            }

            const change: AdapterChange = {
                changedIds,
                local: event.transaction.local,
                origin: event.transaction.origin,
            };

            for (const l of this.listeners) l(change);
        };

        this.yNodes.observe(this.observeHandler);
    }

    destroy(): void {
        this.yNodes.unobserve(this.observeHandler);
        this.listeners.clear();
    }

    onChange(cb: (change: AdapterChange) => void) {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    transact(fn: () => void, origin: unknown = "user-command"): void {
        this.doc.transact(fn, origin);
    }

    getMap(): Map<NodeId, NodeElement> {
        return this.cache;
    }

    get(nodeId: NodeId): NodeElement | undefined {
        return this.cache.get(nodeId);
    }

    set(nodeId: NodeId, node: NodeElement): void {
        this.yNodes.set(nodeId, node);
        this.cache.set(nodeId, node);
    }

    delete(nodeId: NodeId): void {
        this.yNodes.delete(nodeId);
        this.cache.delete(nodeId);
    }

    private normalizeRoot(root: NodeElement) {
        const patch: Partial<RootChildPointers> = {};
        const hasLeft = Object.prototype.hasOwnProperty.call(root, "firstChildIdLeft");
        const hasRight = Object.prototype.hasOwnProperty.call(root, "firstChildIdRight");

        if (!hasLeft) {
            patch.firstChildIdLeft = null;
            patch.lastChildIdLeft = null;
        }
        if (!hasRight) {
            patch.firstChildIdRight = null;
            patch.lastChildIdRight = null;
        }

        if (Object.keys(patch).length === 0) return;

        this.doc.transact(() => {
            const next = { ...root, ...patch, id: root.id };
            this.yNodes.set(root.id, next);
            this.cache.set(root.id, next);
        }, "normalize-root");
    }
}
