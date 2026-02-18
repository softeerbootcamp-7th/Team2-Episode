import * as Y from "yjs";

import { AdapterChange, TreeAdapter } from "@/features/mindmap/types/mindmap_controller";
import type { NodeElement, NodeId } from "@/features/mindmap/types/node";

export const ROOT_NODE_ID = "root";

type Options = {
    doc: Y.Doc;
    roomId: string;
    rootContents?: string;
};

// Yjs에 저장될 Node의 내부 구조 (Y.Map)
type YNodeMap = Y.Map<any>;

export class YjsAdapter implements TreeAdapter {
    private doc: Y.Doc;
    // ⚠️ 변경: NodeElement 객체가 아니라, NodeElement를 담은 Y.Map을 저장
    private yNodes: Y.Map<YNodeMap>;
    private cache = new Map<NodeId, NodeElement>();

    private listeners = new Set<(c: AdapterChange) => void>();
    // ⚠️ 변경: observeDeep 이벤트 핸들러 타입
    private observeHandler: (events: Y.YEvent<any>[], transaction: Y.Transaction) => void;

    constructor({ doc, roomId, rootContents = "" }: Options) {
        this.doc = doc;
        this.yNodes = this.doc.getMap<YNodeMap>(roomId);

        // 1. 초기 로드: Y.Map -> Plain Object 변환하여 캐시에 저장
        this.yNodes.forEach((yNodeMap, key) => {
            // toJSON()은 Y.Map을 일반 JS 객체로 변환해줍니다.
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

                // ⚠️ 중요: 일반 객체 대신 Y.Map을 생성하여 넣습니다.
                const rootMap = new Y.Map();
                for (const [k, v] of Object.entries(rootData)) {
                    rootMap.set(k, v);
                }
                this.yNodes.set(ROOT_NODE_ID, rootMap);
                this.cache.set(ROOT_NODE_ID, rootData);
            }, "init-root");
        }

        // 3. 변경 감지 (observeDeep 사용)
        // 3. 변경 감지 (observeDeep 사용)
        // 3. 변경 감지 (observeDeep 사용)
        this.observeHandler = (events, transaction) => {
            const changedIds = new Set<NodeId>();

            events.forEach((event) => {
                // ------------------------------------------------------------
                // CASE 1: 노드 자체가 추가되거나 삭제된 경우 (yNodes Map 변경)
                // ------------------------------------------------------------
                if (event.target === this.yNodes) {
                    // event.changes.keys: 변경된 키(NodeId)와 변경 정보(action, oldValue)를 담고 있음
                    event.changes.keys.forEach((change, key) => {
                        const nodeId = key as NodeId;
                        changedIds.add(nodeId);

                        const action = change.action; // 'add' | 'delete' | 'update'

                        if (action === "add") {
                            console.log(`✨ [노드 생성] ID: ${nodeId}`);
                        } else if (action === "delete") {
                            // 삭제된 경우 oldValue에 삭제 전 데이터가 들어있을 수 있음 (GC 여부에 따라 다름)
                            console.log(`🔥 [노드 삭제] ID: ${nodeId}`);
                        }
                    });
                }
                // ------------------------------------------------------------
                // CASE 2: 특정 노드 내부의 속성이 변경된 경우 (좌표, 텍스트 등)
                // ------------------------------------------------------------
                else {
                    const targetMap = event.target as YNodeMap;
                    const nodeId = targetMap.get("id") as NodeId;

                    if (nodeId) {
                        changedIds.add(nodeId);

                        console.group(`📝 [속성 변경] Node ID: ${nodeId}`);

                        // event.changes.keys는 Map<key, { action, oldValue }> 입니다.
                        event.changes.keys.forEach((change, key) => {
                            const action = change.action;
                            const oldValue = change.oldValue; // 변경 전 값
                            const newValue = targetMap.get(key); // 변경 후 값 (현재 값)

                            console.log(
                                `   👉 필드: "${key}" (${action})`,
                                `\n      From:`,
                                oldValue,
                                `\n      To  :`,
                                newValue,
                            );
                        });
                        console.groupEnd();
                    }
                }
            });

            // --- 기존 캐시 업데이트 로직 유지 ---
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

        // ⚠️ observe 대신 observeDeep 사용
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

    // 새 노드 생성 (Create)
    // 1. 새 노드 생성 (Create): 아예 새로운 Y.Map을 만들어서 할당
    set(nodeId: NodeId, patch: Partial<NodeElement>): void {
        const nodeMap = new Y.Map();

        // 초기 데이터 세팅
        for (const [key, value] of Object.entries(patch)) {
            nodeMap.set(key, value);
        }

        this.doc.transact(() => {
            // yNodes에 새로운 Y.Map 객체 자체가 들어감
            this.yNodes.set(nodeId, nodeMap);
            this.cache.set(nodeId, patch as NodeElement);
        });
    }

    // 2. 노드 수정 (Update): 기존 Y.Map의 참조를 유지하며 속성만 변경
    update(nodeId: NodeId, patch: Partial<NodeElement>): void {
        // 이미 존재하는 Y.Map을 가져옴
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

            // 로컬 캐시 갱신 (병합)
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
