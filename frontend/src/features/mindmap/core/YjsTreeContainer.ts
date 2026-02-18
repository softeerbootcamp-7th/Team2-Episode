import * as Y from "yjs";

import { MindMapEvents } from "@/features/mindmap/types/mindmap_events";
import {
    AddNodeDirection,
    NodeData,
    NodeDirection,
    NodeElement,
    NodeId,
    NodeType,
} from "@/features/mindmap/types/node";
import { TreeContainer } from "@/features/mindmap/types/tree_container";
import { EventBroker } from "@/utils/EventBroker";
import { exhaustiveCheck } from "@/utils/exhaustive_check";
import generateId from "@/utils/generate_id";

const ROOT_NODE_PARENT_ID = "empty";
const DETACHED_NODE_PARENT_ID = "detached";
const ROOT_NODE_ID: NodeId = "root";

type Options = {
    doc: Y.Doc;
    roomId: string;
    broker?: EventBroker<MindMapEvents>;
    name?: string;
    isThrowError?: boolean;

    /** remote update 들어오면 core가 quadtree/렌더 갱신할 수 있도록 콜백 받음*/
    onRemoteChange?: (changedIds: NodeId[]) => void;
};

export default class YjsTreeContainer implements TreeContainer {
    public nodes: Map<NodeId, NodeElement>;

    private doc: Y.Doc;
    private yNodes: Y.Map<NodeElement>;
    private broker?: EventBroker<MindMapEvents>;
    private isThrowError: boolean;
    private rootNodeId: NodeId = ROOT_NODE_ID;

    private onRemoteChange?: (changedIds: NodeId[]) => void;
    private observeHandler: (event: Y.YMapEvent<NodeElement>) => void;

    constructor({ doc, roomId, broker, name = "", isThrowError = true, onRemoteChange }: Options) {
        this.doc = doc;
        this.broker = broker;
        this.isThrowError = isThrowError;
        this.onRemoteChange = onRemoteChange;

        this.yNodes = this.doc.getMap<NodeElement>(roomId);

        this.nodes = new Map();
        this.yNodes.forEach((value, key) => this.nodes.set(key, value));

        if (this.yNodes.size === 0) {
            this.initRootNode(name);
        } else {
            // root가 없으면 생성(안전장치)
            const root = this.nodes.get(this.rootNodeId);
            if (!root) this.initRootNode(name);
        }

        // (선택) 구버전 스냅샷이면 root 포인터 마이그레이션 가능
        this.migrateRootSplitIfNeeded();

        this.observeHandler = (event) => {
            const changedIds = Array.from(event.keysChanged) as NodeId[];

            for (const nodeId of changedIds) {
                const next = this.yNodes.get(nodeId);
                if (next === undefined) this.nodes.delete(nodeId);
                else this.nodes.set(nodeId, next);

                if (this.broker) {
                    this.broker.publish(nodeId, undefined);
                }
            }

            // remote면 core가 전체 렌더/쿼드트리 갱신하도록 알림
            if (!event.transaction.local) {
                this.onRemoteChange?.(changedIds);
            }
        };

        this.yNodes.observe(this.observeHandler);
    }

    destroy() {
        this.yNodes.unobserve(this.observeHandler);
    }

    transact(fn: () => void, origin: unknown = "user-action") {
        this.doc.transact(fn, origin);
    }

    getRootId() {
        return this.rootNodeId;
    }

    getRootNode() {
        return this._getNode(this.rootNodeId);
    }

    private _getNode(nodeId: NodeId): NodeElement {
        const node = this.nodes.get(nodeId);
        if (!node) throw new Error(`일치하는 Node가 없습니다. (node_id: ${nodeId})`);
        return node;
    }

    safeGetNode(nodeId: NodeId) {
        return this.nodes.get(nodeId);
    }

    safeGetParentNode(nodeId: NodeId) {
        const node = this.safeGetNode(nodeId);
        if (!node) return undefined;
        return this.safeGetNode(node.parentId);
    }

    getParentId(nodeId: NodeId): NodeId | undefined {
        const node = this.safeGetNode(nodeId);
        if (!node) return undefined;
        const parent = this.safeGetNode(node.parentId);
        return parent?.id;
    }

    private initRootNode(contents: string) {
        const root: NodeElement = {
            id: this.rootNodeId,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            addNodeDirection: "right",

            parentId: ROOT_NODE_PARENT_ID,

            firstChildId: null,
            lastChildId: null,

            // ✅ root side split pointers
            firstChildIdLeft: null,
            lastChildIdLeft: null,
            firstChildIdRight: null,
            lastChildIdRight: null,

            nextId: null,
            prevId: null,

            data: { contents },
            type: "root",
        };

        this.yNodes.set(this.rootNodeId, root);
        this.nodes.set(this.rootNodeId, root);
    }

    /** root 포인터가 구버전이면 1회 마이그레이션(옵션) */
    private migrateRootSplitIfNeeded() {
        const root = this.nodes.get(this.rootNodeId);
        if (!root || root.type !== "root") return;

        const hasSplit =
            root.firstChildIdLeft !== undefined ||
            root.firstChildIdRight !== undefined ||
            root.lastChildIdLeft !== undefined ||
            root.lastChildIdRight !== undefined;

        if (hasSplit) return;

        // old root: firstChildId 체인이 존재할 수 있음
        const oldStart = root.firstChildId;
        if (!oldStart) {
            // 포인터만 추가
            this.transact(() => {
                this.patchNode(root.id, {
                    firstChildIdLeft: null,
                    lastChildIdLeft: null,
                    firstChildIdRight: null,
                    lastChildIdRight: null,
                } as any);
            }, "migration");
            return;
        }

        // old chain을 순회하며 side별로 분리
        const rightIds: NodeId[] = [];
        const leftIds: NodeId[] = [];

        let cur: NodeId | null = oldStart;
        while (cur) {
            const n = this.safeGetNode(cur);
            if (!n) break;

            (n.addNodeDirection === "left" ? leftIds : rightIds).push(n.id);
            cur = n.nextId;
        }

        const relink = (ids: NodeId[]) => {
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i]!;
                const prev = i === 0 ? null : ids[i - 1]!;
                const next = i === ids.length - 1 ? null : ids[i + 1]!;
                this.patchNode(id, { prevId: prev, nextId: next });
            }
        };

        this.transact(() => {
            // root split 포인터 세팅
            this.patchNode(root.id, {
                firstChildIdLeft: leftIds[0] ?? null,
                lastChildIdLeft: leftIds[leftIds.length - 1] ?? null,
                firstChildIdRight: rightIds[0] ?? null,
                lastChildIdRight: rightIds[rightIds.length - 1] ?? null,

                // legacy 포인터는 비워두는게 안전
                firstChildId: null,
                lastChildId: null,
            } as any);

            relink(rightIds);
            relink(leftIds);
        }, "migration");
    }

    // ===== root/normal 공통: parent child-list 포인터 get/set =====
    private getFirstChildId(parent: NodeElement, side?: AddNodeDirection): NodeId | null {
        if (parent.type !== "root") return parent.firstChildId;

        if (side === "left") return parent.firstChildIdLeft ?? null;
        if (side === "right") return parent.firstChildIdRight ?? null;

        return parent.firstChildId;
    }

    private getLastChildId(parent: NodeElement, side?: AddNodeDirection): NodeId | null {
        if (parent.type !== "root") return parent.lastChildId;

        if (side === "left") return parent.lastChildIdLeft ?? null;
        if (side === "right") return parent.lastChildIdRight ?? null;

        return parent.lastChildId;
    }

    private setFirstChildId(parent: NodeElement, value: NodeId | null, side?: AddNodeDirection) {
        if (parent.type !== "root") {
            this.patchNode(parent.id, { firstChildId: value });
            return;
        }
        if (side === "left") this.patchNode(parent.id, { firstChildIdLeft: value } as any);
        else if (side === "right") this.patchNode(parent.id, { firstChildIdRight: value } as any);
        else this.patchNode(parent.id, { firstChildId: value });
    }

    private setLastChildId(parent: NodeElement, value: NodeId | null, side?: AddNodeDirection) {
        if (parent.type !== "root") {
            this.patchNode(parent.id, { lastChildId: value });
            return;
        }
        if (side === "left") this.patchNode(parent.id, { lastChildIdLeft: value } as any);
        else if (side === "right") this.patchNode(parent.id, { lastChildIdRight: value } as any);
        else this.patchNode(parent.id, { lastChildId: value });
    }

    private patchNode(nodeId: NodeId, patch: Partial<NodeElement>) {
        const prev = this.nodes.get(nodeId);
        if (!prev) return;

        const next = { ...prev, ...patch, id: nodeId };
        this.yNodes.set(nodeId, next);
        this.nodes.set(nodeId, next);
    }

    private generateNewNodeElement({
        nodeData = { contents: "" },
        type = "normal",
        addNodeDirection = "right",
        id,
    }: { nodeData?: NodeData; type?: NodeType; addNodeDirection?: AddNodeDirection; id?: NodeId } = {}) {
        const newId = id ?? generateId();

        const node: NodeElement = {
            id: newId,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            addNodeDirection: type === "root" ? "right" : addNodeDirection,

            parentId: ROOT_NODE_PARENT_ID,
            firstChildId: null,
            lastChildId: null,

            nextId: null,
            prevId: null,

            data: nodeData,
            type,

            ...(type === "root"
                ? {
                      firstChildIdLeft: null,
                      lastChildIdLeft: null,
                      firstChildIdRight: null,
                      lastChildIdRight: null,
                  }
                : {}),
        };

        this.yNodes.set(newId, node);
        this.nodes.set(newId, node);

        return node;
    }

    // ===== 구조 변경 로직 =====

    private attachNext({ baseNode, movingNode }: { baseNode: NodeElement; movingNode: NodeElement }) {
        const parentNode = this._getNode(baseNode.parentId);
        const side = parentNode.type === "root" ? baseNode.addNodeDirection : undefined;

        if (parentNode.type === "root") {
            this.patchNode(movingNode.id, { addNodeDirection: baseNode.addNodeDirection });
        }

        this.patchNode(movingNode.id, {
            parentId: baseNode.parentId,
            prevId: baseNode.id,
            nextId: baseNode.nextId,
        });

        if (baseNode.nextId) {
            this.patchNode(baseNode.nextId, { prevId: movingNode.id });
        }

        this.patchNode(baseNode.id, { nextId: movingNode.id });

        if (this.getLastChildId(parentNode, side) === baseNode.id) {
            this.setLastChildId(parentNode, movingNode.id, side);
        }
    }

    private attachPrev({ baseNode, movingNode }: { baseNode: NodeElement; movingNode: NodeElement }) {
        const parentNode = this._getNode(baseNode.parentId);
        const side = parentNode.type === "root" ? baseNode.addNodeDirection : undefined;

        if (parentNode.type === "root") {
            this.patchNode(movingNode.id, { addNodeDirection: baseNode.addNodeDirection });
        }

        this.patchNode(movingNode.id, {
            parentId: baseNode.parentId,
            prevId: baseNode.prevId,
            nextId: baseNode.id,
        });

        if (baseNode.prevId) {
            this.patchNode(baseNode.prevId, { nextId: movingNode.id });
        }

        this.patchNode(baseNode.id, { prevId: movingNode.id });

        if (this.getFirstChildId(parentNode, side) === baseNode.id) {
            this.setFirstChildId(parentNode, movingNode.id, side);
        }
    }

    private detach({ node }: { node: NodeElement }) {
        if (node.type === "root") throw new Error("루트 노드는 뗄 수 없습니다.");

        const parentNode = this._getNode(node.parentId);
        const side = parentNode.type === "root" ? node.addNodeDirection : undefined;

        if (this.getFirstChildId(parentNode, side) === node.id) {
            this.setFirstChildId(parentNode, node.nextId, side);
        }
        if (this.getLastChildId(parentNode, side) === node.id) {
            this.setLastChildId(parentNode, node.prevId, side);
        }

        if (node.prevId) this.patchNode(node.prevId, { nextId: node.nextId });
        if (node.nextId) this.patchNode(node.nextId, { prevId: node.prevId });

        this.patchNode(node.id, {
            prevId: null,
            nextId: null,
            parentId: DETACHED_NODE_PARENT_ID,
        });
    }

    appendChild({
        parentNodeId,
        childNodeId,
        addNodeDirection,
    }: {
        parentNodeId: NodeId;
        childNodeId?: NodeId;
        addNodeDirection?: AddNodeDirection;
    }) {
        const parentNode = this._getNode(parentNodeId);

        const childNode = childNodeId ? this._getNode(childNodeId) : this.generateNewNodeElement();

        const finalDirection =
            parentNode.type === "root"
                ? addNodeDirection || childNode.addNodeDirection || "right"
                : parentNode.addNodeDirection;

        this.patchNode(childNode.id, {
            parentId: parentNodeId,
            addNodeDirection: finalDirection,
        });

        const side = parentNode.type === "root" ? finalDirection : undefined;
        const lastId = this.getLastChildId(parentNode, side);

        if (lastId) {
            this.patchNode(lastId, { nextId: childNode.id });
            this.patchNode(childNode.id, { prevId: lastId, nextId: null });
            this.setLastChildId(parentNode, childNode.id, side);
        } else {
            this.setFirstChildId(parentNode, childNode.id, side);
            this.setLastChildId(parentNode, childNode.id, side);
            this.patchNode(childNode.id, { prevId: null, nextId: null });
        }
    }

    attachTo({
        baseNodeId,
        direction,
        addNodeDirection,
    }: {
        baseNodeId: NodeId;
        direction: NodeDirection;
        addNodeDirection: AddNodeDirection;
    }) {
        try {
            let createdId: NodeId | undefined;

            this.transact(() => {
                const baseNode = this._getNode(baseNodeId);

                if (baseNode.type === "root" && direction !== "child") {
                    throw new Error("루트 노드의 형제로는 노드를 추가할 수 없습니다.");
                }

                const newNode = this.generateNewNodeElement({ addNodeDirection });

                switch (direction) {
                    case "next":
                        this.attachNext({ baseNode, movingNode: newNode });
                        break;
                    case "prev":
                        this.attachPrev({ baseNode, movingNode: newNode });
                        break;
                    case "child":
                        this.appendChild({ parentNodeId: baseNode.id, childNodeId: newNode.id, addNodeDirection });
                        break;
                    default:
                        exhaustiveCheck(`${direction} 방향은 불가능합니다.`);
                }

                createdId = newNode.id;
            });

            return createdId;
        } catch (e) {
            this.handleError(e);
        }
    }

    moveTo({
        baseNodeId,
        movingNodeId,
        direction,
        addNodeDirection,
    }: {
        baseNodeId: NodeId;
        movingNodeId: NodeId;
        direction: NodeDirection;
        addNodeDirection?: AddNodeDirection;
    }) {
        if (direction === "child" && baseNodeId === movingNodeId) return;
        if (baseNodeId === movingNodeId) return;

        this.transact(() => {
            try {
                const baseNode = this._getNode(baseNodeId);
                const movingNode = this._getNode(movingNodeId);

                const checkNodeId = direction !== "child" ? baseNode.parentId : baseNode.id;

                let tempParent = this.safeGetNode(checkNodeId);
                while (tempParent) {
                    if (tempParent.id === movingNodeId) throw new Error("자손 밑으로 이동 불가");
                    if (tempParent.type === "root") break;
                    tempParent = this.safeGetNode(tempParent.parentId);
                }

                this.detach({ node: movingNode });

                switch (direction) {
                    case "next":
                        this.attachNext({ baseNode, movingNode });
                        break;
                    case "prev":
                        this.attachPrev({ baseNode, movingNode });
                        break;
                    case "child":
                        this.appendChild({
                            parentNodeId: baseNode.id,
                            childNodeId: movingNode.id,
                            addNodeDirection,
                        });
                        break;
                    default:
                        exhaustiveCheck(`${direction} 방향은 불가능합니다.`);
                }
            } catch (e) {
                this.handleError(e);
            }
        });
    }

    delete({ nodeId }: { nodeId: NodeId }) {
        this.transact(() => {
            try {
                const node = this._getNode(nodeId);
                if (node.type === "root") throw new Error("루트 노드는 삭제할 수 없습니다.");

                const parentNode = this._getNode(node.parentId);
                const side = parentNode.type === "root" ? node.addNodeDirection : undefined;

                if (this.getFirstChildId(parentNode, side) === node.id) {
                    this.setFirstChildId(parentNode, node.nextId, side);
                }
                if (this.getLastChildId(parentNode, side) === node.id) {
                    this.setLastChildId(parentNode, node.prevId, side);
                }

                if (node.prevId) this.patchNode(node.prevId, { nextId: node.nextId });
                if (node.nextId) this.patchNode(node.nextId, { prevId: node.prevId });

                this.deleteTraverse(node.id);
            } catch (e) {
                this.handleError(e);
            }
        });
    }

    private deleteTraverse(nodeId: NodeId) {
        const node = this.safeGetNode(nodeId);
        if (!node) return;

        let childId = node.firstChildId;
        while (childId) {
            const child = this.safeGetNode(childId);
            if (!child) break;
            const nextId = child.nextId;
            this.deleteTraverse(childId);
            childId = nextId;
        }

        this.yNodes.delete(nodeId);
        this.nodes.delete(nodeId);
    }

    update({ nodeId, newNodeData }: { nodeId: NodeId; newNodeData: Partial<Omit<NodeElement, "id">> }) {
        this.transact(() => {
            // 유효성 검사용
            this._getNode(nodeId);
            this.patchNode(nodeId, newNodeData as any);
        });
    }

    // ===== 조회 =====

    private collectChildIdsFromList(startId: NodeId | null, out: NodeId[]) {
        let cur = startId;
        while (cur) {
            out.push(cur);
            const n = this.safeGetNode(cur);
            if (!n) break;
            cur = n.nextId;
        }
    }

    getChildIds(nodeId: NodeId): NodeId[] {
        const node = this.safeGetNode(nodeId);
        if (!node) return [];

        if (node.type === "root") {
            const ids: NodeId[] = [];
            this.collectChildIdsFromList(node.firstChildIdRight ?? null, ids);
            this.collectChildIdsFromList(node.firstChildIdLeft ?? null, ids);
            return ids;
        }

        const childIds: NodeId[] = [];
        let currentChildId = node.firstChildId;

        while (currentChildId) {
            childIds.push(currentChildId);
            const childNode = this.safeGetNode(currentChildId);
            if (!childNode) break;
            currentChildId = childNode.nextId;
        }
        return childIds;
    }

    getChildNodes(parentNodeId: NodeId): NodeElement[] {
        const ids = this.getChildIds(parentNodeId);
        const nodes: NodeElement[] = [];

        for (const id of ids) {
            const n = this.safeGetNode(id);
            if (!n) {
                console.error("유효하지 않은 childNode가 존재하므로 빈 배열을 반환합니다.");
                return [];
            }
            nodes.push(n);
        }

        return nodes;
    }

    getAllDescendantIds(nodeId: NodeId): Set<NodeId> {
        const descendants = new Set<NodeId>();
        descendants.add(nodeId);

        const traverse = (currentId: NodeId) => {
            const children = this.getChildIds(currentId);
            children.forEach((childId) => {
                descendants.add(childId);
                traverse(childId);
            });
        };

        traverse(nodeId);
        return descendants;
    }

    private handleError(e: unknown) {
        if (e instanceof Error) console.error(e.message);
        else console.error(String(e));
        if (this.isThrowError) throw e;
    }
}

export const makeDocWithArr = ({ name, items, mindmapId }: { name: string; items: string[]; mindmapId: string }) => {
    const doc = new Y.Doc();

    const tree = new YjsTreeContainer({
        doc,
        roomId: mindmapId,
        name,
    });

    const rootId = tree.getRootId();

    items.forEach((item, i) => {
        const newNodeId = tree.attachTo({
            baseNodeId: rootId,
            direction: "child",
            addNodeDirection: i % 2 === 0 ? "right" : "left",
        });

        if (newNodeId) {
            tree.update({
                nodeId: newNodeId,
                newNodeData: {
                    data: { contents: item },
                },
            });
        }
    });

    return doc;
};
