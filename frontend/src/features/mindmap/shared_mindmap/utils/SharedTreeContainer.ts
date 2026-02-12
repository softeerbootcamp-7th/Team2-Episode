import * as Y from "yjs";

import { NodeData, NodeElement, NodeId, NodeType } from "@/features/mindmap/types/mindmap";
import { EventBroker } from "@/utils/EventBroker";
import { exhaustiveCheck } from "@/utils/exhaustive_check";
import generateId from "@/utils/generate_id";

// TODO: quadtree 준비되면 의존성 주입

const TRANSACTION_ORIGINS = {
    USER_ACTION: "user_action",
    LAYOUT: "layout",
    REMOTE: "remote",
} as const;

export type TransactionOrigin = (typeof TRANSACTION_ORIGINS)[keyof typeof TRANSACTION_ORIGINS];

const ROOT_NODE_PARENT_ID = "empty";
const ROOT_NODE_CONTENTS = "김현대의 마인드맵";
export const ROOT_NODE_ID = "root";

const DETACHED_NODE_PARENT_ID = "detached";
const ROOM_NAME = "mindmap-nodes";

export default class SharedTreeContainer {
    public undoManager: Y.UndoManager;
    public doc: Y.Doc;
    public yNodes: Y.Map<NodeElement>;
    private cachedNodes: Map<NodeId, NodeElement>;

    public broker: EventBroker<NodeId>;
    private isThrowError: boolean;
    private rootNodeId: NodeId = ROOT_NODE_ID;

    public onTransaction?: (event: Y.YMapEvent<NodeElement>, origin: TransactionOrigin) => void;

    constructor({
        isThrowError = true,
        name = ROOT_NODE_CONTENTS,
        broker,
        doc,
    }: {
        broker: EventBroker<NodeId>;
        name?: string;
        isThrowError?: boolean;
        doc: Y.Doc;
    }) {
        // initialization
        this.doc = doc;
        this.broker = broker;
        this.yNodes = this.doc.getMap(ROOM_NAME);

        this.cachedNodes = new Map();
        this.yNodes.forEach((value, key) => {
            this.cachedNodes.set(key, value);
        });

        if (this.yNodes.size === 0) {
            this.initRootNode(name);
        }

        this.undoManager = new Y.UndoManager(this.yNodes, {
            captureTimeout: 500,
            trackedOrigins: new Set(["user-action"]),
        });

        this.isThrowError = isThrowError;

        this.yNodes.observe((event) => {
            const origin = event.transaction.origin as TransactionOrigin;

            event.keysChanged.forEach((nodeId) => {
                const newValue = this.yNodes.get(nodeId);

                if (newValue === undefined) {
                    this.cachedNodes.delete(nodeId);
                } else {
                    this.cachedNodes.set(nodeId, newValue);
                }

                this.broker.publish(nodeId);
            });

            if (this.onTransaction) {
                this.onTransaction(event, origin);
            }
        });
    }

    private initRootNode(contents: string) {
        this.doc.transact(() => {
            this.generateNewNodeElement({
                nodeData: { contents },
                id: this.rootNodeId,
                type: "root",
            });
        }, TRANSACTION_ORIGINS.USER_ACTION);
    }

    public getDoc() {
        return this.doc;
    }

    appendChild(
        { parentNodeId, childNodeId }: { parentNodeId: NodeId; childNodeId?: NodeId },
        origin: TransactionOrigin = "user_action",
    ) {
        this.doc.transact(() => {
            try {
                let childNode: NodeElement;
                if (childNodeId) {
                    childNode = this._getNode(childNodeId);
                } else {
                    childNode = this.generateNewNodeElement();
                }

                const parentNode = this._getNode(parentNodeId);

                this._updateNode(childNode.id, { parentId: parentNodeId });

                if (parentNode.lastChildId) {
                    const lastNode = this._getNode(parentNode.lastChildId);

                    this._updateNode(lastNode.id, { nextId: childNode.id });
                    this._updateNode(childNode.id, {
                        prevId: lastNode.id,
                        nextId: null,
                    });
                    this._updateNode(parentNode.id, { lastChildId: childNode.id });
                } else {
                    this._updateNode(parentNode.id, {
                        firstChildId: childNode.id,
                        lastChildId: childNode.id,
                    });
                }
            } catch (e) {
                this.handleError(e);
            }
        }, origin);
    }

    attachTo({ baseNodeId, direction }: { baseNodeId: NodeId; direction: "prev" | "next" | "child" }) {
        this.doc.transact(() => {
            try {
                const baseNode = this._getNode(baseNodeId);

                if (baseNode.type === "root") {
                    throw new Error("루트 노드의 형제로는 노드를 추가할 수 없습니다.");
                }

                const newNode = this.generateNewNodeElement();

                switch (direction) {
                    case "next":
                        this.attachNext({ baseNode, movingNode: newNode });
                        break;
                    case "prev":
                        this.attachPrev({ baseNode, movingNode: newNode });
                        break;
                    case "child":
                        this.appendChild({ parentNodeId: baseNode.id, childNodeId: newNode.id });
                        break;
                    default:
                        exhaustiveCheck(`${direction} 방향은 불가능합니다.`);
                }
            } catch (e) {
                this.handleError(e);
            }
        }, "user-action");
    }

    private attachNext({ baseNode, movingNode }: { baseNode: NodeElement; movingNode: NodeElement }) {
        this._updateNode(movingNode.id, {
            parentId: baseNode.parentId,
            prevId: baseNode.id,
            nextId: baseNode.nextId,
        });

        if (baseNode.nextId) {
            this._updateNode(baseNode.nextId, {
                prevId: movingNode.id,
            });
        }

        this._updateNode(baseNode.id, {
            nextId: movingNode.id,
        });

        const parentNode = this._getNode(baseNode.parentId);
        if (parentNode.lastChildId === baseNode.id) {
            this._updateNode(parentNode.id, {
                lastChildId: movingNode.id,
            });
        }
    }

    private attachPrev({ baseNode, movingNode }: { baseNode: NodeElement; movingNode: NodeElement }) {
        this._updateNode(movingNode.id, {
            parentId: baseNode.parentId,
            prevId: baseNode.prevId,
            nextId: baseNode.id,
        });

        if (baseNode.prevId) {
            this._updateNode(baseNode.prevId, {
                nextId: movingNode.id,
            });
        }

        this._updateNode(baseNode.id, {
            prevId: movingNode.id,
        });

        const parentNode = this._getNode(baseNode.parentId);
        if (parentNode.firstChildId === baseNode.id) {
            this._updateNode(parentNode.id, {
                firstChildId: movingNode.id,
            });
        }
    }

    delete({ nodeId, origin = "user_action" }: { nodeId: NodeId; origin?: TransactionOrigin }) {
        this.doc.transact(() => {
            try {
                const node = this._getNode(nodeId);
                if (node.type === "root") {
                    throw new Error("루트 노드는 삭제할 수 없습니다.");
                }

                const parentNode = this._getNode(node.parentId);

                if (parentNode.firstChildId === node.id) {
                    this._updateNode(parentNode.id, { firstChildId: node.nextId });
                }

                if (parentNode.lastChildId === node.id) {
                    this._updateNode(parentNode.id, { lastChildId: node.prevId });
                }

                if (node.prevId) {
                    this._updateNode(node.prevId, { nextId: node.nextId });
                }

                if (node.nextId) {
                    this._updateNode(node.nextId, { prevId: node.prevId });
                }

                this._deleteTraverse({ nodeId });
            } catch (e) {
                this.handleError(e);
            }
        }, origin);
    }

    private _deleteTraverse({ nodeId }: { nodeId: NodeId }) {
        const node = this.safeGetNode(nodeId);
        if (!node) return;

        let childId = node.firstChildId;

        while (childId) {
            const child = this.safeGetNode(childId);
            if (!child) break;

            const nextChildId = child.nextId;
            this._deleteTraverse({ nodeId: childId });
            childId = nextChildId;
        }

        this.deleteNode(nodeId);
    }

    moveTo({
        baseNodeId,
        movingNodeId,
        direction,
    }: {
        baseNodeId: NodeId;
        movingNodeId: NodeId;
        direction: "prev" | "next" | "child";
    }) {
        if (direction === "child" && baseNodeId === movingNodeId) return;
        if (baseNodeId === movingNodeId) return;

        this.doc.transact(() => {
            try {
                const baseNode = this._getNode(baseNodeId);
                const movingNode = this._getNode(movingNodeId);

                const checkNodeId = direction !== "child" ? baseNode.parentId : baseNode.id;

                let tempParent = this.safeGetNode(checkNodeId);
                while (tempParent) {
                    if (tempParent.id === movingNodeId) {
                        throw new Error("자손 밑으로 이동 불가");
                    }
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
                        this.appendChild({ parentNodeId: baseNode.id, childNodeId: movingNode.id });
                        break;
                    default:
                        exhaustiveCheck(`${direction} 방향은 불가능합니다.`);
                }
            } catch (e) {
                this.handleError(e);
            }
        }, "user-action");
    }

    private detach({ node }: { node: NodeElement }) {
        if (node.type === "root") {
            throw new Error("루트 노드는 뗄 수 없습니다.");
        }

        const parentNode = this._getNode(node.parentId);

        if (parentNode.firstChildId === node.id) {
            this._updateNode(parentNode.id, { firstChildId: node.nextId });
        }

        if (parentNode.lastChildId === node.id) {
            this._updateNode(parentNode.id, { lastChildId: node.prevId });
        }

        if (node.prevId) {
            this._updateNode(node.prevId, { nextId: node.nextId });
        }

        if (node.nextId) {
            this._updateNode(node.nextId, { prevId: node.prevId });
        }

        this._updateNode(node.id, {
            prevId: null,
            nextId: null,
            parentId: DETACHED_NODE_PARENT_ID,
        });
    }

    update({ nodeId, newNodeData }: { nodeId: NodeId; newNodeData: Partial<Omit<NodeElement, "id">> }) {
        try {
            // 유효성 검사를 위해 get
            this._getNode(nodeId);
            // 업데이트 수행
            this._updateNode(nodeId, newNodeData);
        } catch (e) {
            this.handleError(e);
        }
    }

    private _getNode(nodeId: NodeId): NodeElement {
        const node = this.cachedNodes.get(nodeId);

        if (!node) {
            throw new Error(`일치하는 Node가 없습니다. (node_id: ${nodeId})`);
        }
        return node;
    }

    safeGetNode(nodeId: NodeId): NodeElement | undefined {
        return this.cachedNodes.get(nodeId);
    }

    private _updateNode(nodeId: NodeId, patch: Partial<NodeElement>) {
        const prev = this.cachedNodes.get(nodeId);

        if (!prev) return;

        this.yNodes.set(nodeId, { ...prev, ...patch });
        this.cachedNodes.set(nodeId, { ...prev, ...patch });
    }

    public clear(origin: TransactionOrigin = "user_action") {
        this.doc.transact(() => {
            this.yNodes.clear();
            this.cachedNodes.clear();

            this.generateNewNodeElement({
                nodeData: { contents: "새로운 마인드맵" },
                id: this.rootNodeId,
                type: "root",
            });
        }, origin);
    }

    public updateNode(nodeId: NodeId, patch: Partial<NodeElement>, origin: TransactionOrigin = "user_action") {
        this.doc.transact(() => {
            const prev = this.cachedNodes.get(nodeId);
            if (!prev) return;
            this.yNodes.set(nodeId, { ...prev, ...patch });
            this.cachedNodes.set(nodeId, { ...prev, ...patch });
        }, origin);
    }

    public setNode(nodeId: NodeId, node: NodeElement, origin: TransactionOrigin = "user_action") {
        this.doc.transact(() => {
            this.yNodes.set(nodeId, node);
            this.cachedNodes.set(nodeId, node);
        }, origin);
    }

    public deleteNode(nodeId: NodeId, origin: TransactionOrigin = "user_action") {
        this.doc.transact(() => {
            this.yNodes.delete(nodeId);
            this.cachedNodes.delete(nodeId);
        }, origin);
    }

    private generateNewNodeElement({
        nodeData = { contents: "" },
        type = "normal",
        id,
    }: { nodeData?: NodeData; type?: NodeType; id?: NodeId } = {}) {
        const newNodeId = id ?? generateId();

        const node: NodeElement = {
            id: newNodeId,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            parentId: ROOT_NODE_PARENT_ID,
            firstChildId: null,
            lastChildId: null,
            nextId: null,
            prevId: null,
            data: nodeData,
            type,
        };

        this.yNodes.set(newNodeId, node);
        this.cachedNodes.set(newNodeId, node);

        return node;
    }

    getChildIds(nodeId: NodeId): NodeId[] {
        const node = this.safeGetNode(nodeId);
        if (!node) return [];

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

    safeGetParentNode(nodeId: NodeId) {
        const node = this.safeGetNode(nodeId);
        if (!node) return undefined;
        return this.safeGetNode(node.parentId);
    }

    getRootId() {
        return this.rootNodeId;
    }

    getParentId(nodeId: NodeId): NodeId | undefined {
        const node = this.safeGetNode(nodeId);
        if (!node) return undefined;
        return node.parentId;
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

    getChildNodes(parentNodeId: NodeId): NodeElement[] {
        const node = this.safeGetNode(parentNodeId);
        if (!node) return [];

        const childNodes: NodeElement[] = [];
        let currentChildId = node.firstChildId;

        while (currentChildId) {
            const childNode = this.safeGetNode(currentChildId);
            if (!childNode) {
                console.error("유효하지 않은 childNode가 존재하므로 빈 배열을 반환합니다.");
                return [];
            }
            childNodes.push(childNode);
            currentChildId = childNode.nextId;
        }
        return childNodes;
    }

    getRootNode() {
        return this._getNode(this.rootNodeId);
    }

    private handleError(e: unknown) {
        if (e instanceof Error) {
            console.error(e.message);
        } else {
            console.error(String(e));
        }
        if (this.isThrowError) {
            throw e;
        }
    }
}
