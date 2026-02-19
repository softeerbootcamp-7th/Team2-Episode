/**
 * 수정되어야 하는 파일이므로 타입을 무시하는 주석이 작성되어있습니다.
 * 수정
 */
import * as Y from "yjs";

import { AdapterChange, TreeAdapter } from "@/features/mindmap/types/mindmap_controller";
import type { NodeElement, NodeId } from "@/features/mindmap/types/node";

export const ROOT_NODE_ID = "root";

type Options = {
    doc: Y.Doc;
    roomId: string;
    rootContents?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YNodeMap = Y.Map<any>;

export class YjsAdapter implements TreeAdapter {
    private doc: Y.Doc;
    private yNodes: Y.Map<YNodeMap>;
    private cache = new Map<NodeId, NodeElement>();

    private listeners = new Set<(c: AdapterChange) => void>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private observeHandler: (events: Y.YEvent<any>[], transaction: Y.Transaction) => void;

    constructor({ doc, roomId, rootContents = "" }: Options) {
        this.doc = doc;
        this.yNodes = this.doc.getMap<YNodeMap>(roomId);

        this.yNodes.forEach((yNodeMap, key) => {
            this.cache.set(key as NodeId, yNodeMap.toJSON() as NodeElement);
        });

        // 2. 루트 노드 초기화
        if (!this.yNodes.has(ROOT_NODE_ID)) {
            this.doc.transact(() => {
                const rootData: NodeElement = {
                    id: ROOT_NODE_ID,
                    type: "root",
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    addNodeDirection: "right",
                    parentId: "empty",
                    firstChildId: null,
                    lastChildId: null,
                    nextId: null,
                    prevId: null,
                    contents: rootContents,
                    // Root 전용 필드들...
                    firstChildIdLeft: null,
                    lastChildIdLeft: null,
                    firstChildIdRight: null,
                    lastChildIdRight: null,
                };

                const rootMap = new Y.Map();
                for (const [k, v] of Object.entries(rootData)) {
                    rootMap.set(k, v);
                }
                this.yNodes.set(ROOT_NODE_ID, rootMap);
                this.cache.set(ROOT_NODE_ID, rootData);
            }, "init-root");
        }

        this.observeHandler = (events, transaction) => {
            const changedIds = new Set<NodeId>();

            events.forEach((event) => {
                if (event.target === this.yNodes) {
                    event.changes.keys.forEach((change, key) => {
                        const nodeId = key;
                        changedIds.add(nodeId);
                    });
                } else {
                    const targetMap = event.target;
                    const nodeId = targetMap.get("id");

                    if (nodeId) {
                        changedIds.add(nodeId);
                    }
                }
            });

            for (const id of changedIds) {
                const yNodeMap = this.yNodes.get(id);
                if (yNodeMap === undefined) {
                    this.cache.delete(id);
                } else {
                    this.cache.set(id, yNodeMap.toJSON() as NodeElement);
                }
            }

            const change: AdapterChange = {
                changedIds: Array.from(changedIds),
                local: transaction.local,
                origin: transaction.origin,
            };

            for (const l of this.listeners) l(change);
        };

        this.yNodes.observeDeep(this.observeHandler);
    }

    destroy(): void {
        this.yNodes.unobserveDeep(this.observeHandler);
        this.listeners.clear();
    }

    onChange(cb: (change: AdapterChange) => void) {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    transact(fn: () => void, origin: unknown = "user-command"): void {
        console.log("✍️ 현재 쓰고 있는 Doc ID:", this.doc.clientID); // 여기!!
        this.doc.transact(fn, origin);
    }

    getMap(): Map<NodeId, NodeElement> {
        return this.cache;
    }

    get(nodeId: NodeId): NodeElement | undefined {
        return this.cache.get(nodeId);
    }

    set(nodeId: NodeId, patch: Partial<NodeElement>): void {
        const nodeMap = new Y.Map();

        for (const [key, value] of Object.entries(patch)) {
            nodeMap.set(key, value);
        }

        this.doc.transact(() => {
            this.yNodes.set(nodeId, nodeMap);
            this.cache.set(nodeId, patch as NodeElement);
        });
    }

    update(nodeId: NodeId, patch: Partial<NodeElement>): void {
        const targetMap = this.yNodes.get(nodeId);

        if (!targetMap) {
            console.warn(`Node ${nodeId} not found for update. falling back to set.`);
            this.set(nodeId, patch);
            return;
        }

        this.doc.transact(() => {
            for (const [key, value] of Object.entries(patch)) {
                targetMap.set(key, value);
            }

            const existing = this.cache.get(nodeId);
            if (existing) {
                this.cache.set(nodeId, { ...existing, ...patch });
            }
        });
    }

    delete(nodeId: NodeId): void {
        this.yNodes.delete(nodeId);
        this.cache.delete(nodeId);
    }
}
