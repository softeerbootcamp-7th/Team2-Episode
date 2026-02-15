import {
    AddNodeDirection,
    NodeData,
    NodeDirection,
    NodeElement,
    NodeId,
    NodeType,
} from "@/features/mindmap/types/node";
import { exhaustiveCheck } from "@/utils/exhaustive_check";
import generateId from "@/utils/generate_id";

const ROOT_NODE_PARENT_ID = "empty";
const ROOT_NODE_CONTENTS = "김현대";
const DETACHED_NODE_PARENT_ID = "detached";

export default class TreeContainer {
    public nodes: Map<NodeId, NodeElement>;
    private isThrowError: boolean;
    private rootNodeId: NodeId;

    constructor({ name = ROOT_NODE_CONTENTS, isThrowError = true }: { name?: string; isThrowError?: boolean } = {}) {
        this.nodes = new Map();
        const rootNodeElement = this.generateNewNodeElement({
            nodeData: {
                contents: name,
            },
            type: "root",
        });
        this.rootNodeId = rootNodeElement.id;
        this.addNodeToContainer(rootNodeElement);
        this.isThrowError = isThrowError;
    }

    private _getNode(nodeId: NodeId): NodeElement {
        const node = this.nodes.get(nodeId);

        if (!node) {
            throw new Error(`일치하는 Node가 없습니다. (node_id: ${nodeId})`);
        }

        return node;
    }

    private generateNewNodeElement({
        nodeData = { contents: "" },
        type = "normal",
        addNodeDirection = "left",
    }: { nodeData?: NodeData; type?: NodeType; addNodeDirection?: AddNodeDirection } = {}) {
        const node: NodeElement = {
            id: generateId(),
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            addNodeDirection,

            parentId: ROOT_NODE_PARENT_ID,
            firstChildId: null,
            lastChildId: null,

            nextId: null,
            prevId: null,

            data: nodeData,
            type,
        };

        this.addNodeToContainer(node);

        return node;
    }

    private addNodeToContainer(node: NodeElement) {
        this.nodes.set(node.id, node);
    }

    private attachNext({ baseNode, movingNode }: { baseNode: NodeElement; movingNode: NodeElement }) {
        movingNode.parentId = baseNode.parentId;

        movingNode.prevId = baseNode.id;
        movingNode.nextId = baseNode.nextId;

        if (baseNode.nextId) {
            const nextSibling = this._getNode(baseNode.nextId);

            nextSibling.prevId = movingNode.id;
        }

        baseNode.nextId = movingNode.id;

        const parentNode = this._getNode(baseNode.parentId);
        if (parentNode.lastChildId === baseNode.id) {
            parentNode.lastChildId = movingNode.id;
        }
    }

    private attachPrev({ baseNode, movingNode }: { baseNode: NodeElement; movingNode: NodeElement }) {
        movingNode.parentId = baseNode.parentId;

        movingNode.nextId = baseNode.id;
        movingNode.prevId = baseNode.prevId;

        if (baseNode.prevId) {
            const prevSibling = this._getNode(baseNode.prevId);

            prevSibling.nextId = movingNode.id;
        }

        baseNode.prevId = movingNode.id;

        const parentNode = this._getNode(baseNode.parentId);

        if (parentNode.firstChildId === baseNode.id) {
            parentNode.firstChildId = movingNode.id;
        }
    }

    private detach({ node }: { node: NodeElement }) {
        if (node.type === "root") {
            throw new Error("루트 노드는 뗄 수 없습니다.");
        }

        const parentNode = this._getNode(node.parentId);

        // 1. 부모 포인터 갱신
        if (parentNode.firstChildId === node.id) {
            parentNode.firstChildId = node.nextId;
        }

        if (parentNode.lastChildId === node.id) {
            parentNode.lastChildId = node.prevId;
        }

        if (node.prevId) {
            this._getNode(node.prevId).nextId = node.nextId;
        }

        if (node.nextId) {
            this._getNode(node.nextId).prevId = node.prevId;
        }
        node.prevId = null;
        node.nextId = null;
        node.parentId = DETACHED_NODE_PARENT_ID; // 임시 상태.
    }

    private deleteNodeFromContainer(nodeId: NodeId) {
        this.nodes.delete(nodeId);
    }

    private _deleteTraverse({ nodeId }: { nodeId: NodeId }) {
        const node = this._getNode(nodeId);
        let childId = node.firstChildId;

        while (childId) {
            const child = this.safeGetNode(childId);
            if (!child) break;
            const nextId = child.nextId;
            this._deleteTraverse({ nodeId: childId });
            childId = nextId;
        }
        this.deleteNodeFromContainer(nodeId);
    }

    moveTo({
        baseNodeId,
        movingNodeId,
        direction,
    }: {
        baseNodeId: NodeId;
        movingNodeId: NodeId;
        direction: NodeDirection;
    }) {
        // 제자리
        if (direction === "child" && baseNodeId === movingNodeId) {
            return;
        }

        if (baseNodeId === movingNodeId) {
            return;
        }

        try {
            const baseNode = this._getNode(baseNodeId);
            const movingNode = this._getNode(movingNodeId);

            let checkNodeId = baseNode.id;
            if (direction !== "child") {
                checkNodeId = baseNode.parentId;
            }

            // drop한 곳에서 위로 가면서 movingNode가 있는지 확인
            let tempParent = this.safeGetNode(checkNodeId);
            while (tempParent) {
                if (tempParent.id === movingNodeId) {
                    throw new Error("자손 밑으로 이동 불가");
                }

                if (tempParent.type === "root") {
                    break;
                }

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
            const baseNode = this._getNode(baseNodeId);

            const newNode = this.generateNewNodeElement({
                addNodeDirection: addNodeDirection,
            });

            switch (direction) {
                case "next":
                    this.attachNext({ baseNode, movingNode: newNode });
                    break;
                case "prev":
                    this.attachPrev({ baseNode, movingNode: newNode });
                    break;
                case "child":
                    this.appendChild({
                        parentNodeId: baseNode.id,
                        childNodeId: newNode.id,
                        addNodeDirection: addNodeDirection,
                    });
                    break;
                default:
                    exhaustiveCheck(`${direction} 방향은 불가능합니다.`);
            }

            return newNode.id;
        } catch (e) {
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

    appendChild({
        parentNodeId,
        childNodeId: cId,
        addNodeDirection,
    }: {
        parentNodeId: NodeId;
        childNodeId?: NodeId;
        addNodeDirection?: AddNodeDirection;
    }) {
        try {
            const parentNode = this._getNode(parentNodeId);
            const finalDirection =
                parentNode.type === "root" ? addNodeDirection || "right" : parentNode.addNodeDirection;

            // 노드 생성 (또는 기존 노드 가져오기)
            const childNode = cId
                ? this._getNode(cId)
                : this.generateNewNodeElement({ addNodeDirection: finalDirection });

            childNode.parentId = parentNodeId;
            childNode.addNodeDirection = finalDirection;

            // [Double Linked List 연결: 항상 맨 뒤에 추가]
            if (parentNode.lastChildId) {
                // 이미 자식이 있는 경우: 기존 막내의 뒤에 붙임
                const lastNode = this._getNode(parentNode.lastChildId);
                lastNode.nextId = childNode.id;
                childNode.prevId = lastNode.id;

                // 부모의 막내 정보를 새 노드로 갱신
                parentNode.lastChildId = childNode.id;
                childNode.nextId = null; // 막내이므로 다음은 없음
            } else {
                // 첫 번째 자식인 경우: 첫째이자 막내가 됨
                parentNode.firstChildId = childNode.id;
                parentNode.lastChildId = childNode.id;
                childNode.prevId = null;
                childNode.nextId = null;
            }
        } catch (e) {
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

    delete({ nodeId }: { nodeId: NodeId }) {
        try {
            const node = this._getNode(nodeId);
            if (node.type === "root") {
                throw new Error("루트 노드는 삭제할 수 없습니다.");
            }

            const parentNode = this._getNode(node.parentId);

            if (parentNode.firstChildId === node.id) {
                parentNode.firstChildId = node.nextId;
            }

            if (parentNode.lastChildId === node.id) {
                parentNode.lastChildId = node.prevId;
            }

            if (node.prevId) {
                const prevNode = this._getNode(node.prevId);
                prevNode.nextId = node.nextId;
            }

            if (node.nextId) {
                const nextNode = this._getNode(node.nextId);
                nextNode.prevId = node.prevId;
            }

            this._deleteTraverse({ nodeId });
        } catch (e) {
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

    update({ nodeId, newNodeData }: { nodeId: NodeId; newNodeData: Partial<Omit<NodeElement, "id">> }) {
        try {
            const oldNode = this._getNode(nodeId);
            const newNodeElement: NodeElement = { ...oldNode, ...newNodeData, id: nodeId };
            this.addNodeToContainer(newNodeElement);
        } catch (e) {
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

    // ===== 조회 / 탐색 ====== //
    getChildIds(nodeId: NodeId): NodeId[] {
        const node = this.safeGetNode(nodeId);
        if (!node) {
            return [];
        }

        const childIds: NodeId[] = [];
        let currentChildId = node.firstChildId;

        while (currentChildId) {
            childIds.push(currentChildId);
            const childNode = this.safeGetNode(currentChildId);
            if (!childNode) {
                break;
            }
            currentChildId = childNode.nextId;
        }
        return childIds;
    }

    getAllDescendantIds(nodeId: NodeId): Set<NodeId> {
        const descendants = new Set<NodeId>();
        descendants.add(nodeId); // 자기 자신 포함

        const traverse = (currentId: NodeId) => {
            const children = this.getChildIds(currentId);
            children.forEach((childId) => {
                descendants.add(childId);
                traverse(childId); // 재귀 호출
            });
        };

        traverse(nodeId);
        return descendants;
    }

    getChildNodes(parentNodeId: NodeId): NodeElement[] {
        const node = this.safeGetNode(parentNodeId);
        if (!node) {
            return [];
        }

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

    safeGetNode(nodeId: NodeId) {
        const node = this.nodes.get(nodeId);

        if (!node) {
            return undefined;
        }

        return node;
    }

    safeGetParentNode(nodeId: NodeId) {
        const node = this.safeGetNode(nodeId);

        if (!node) {
            return undefined;
        }

        const parentNode = this.safeGetNode(node.parentId);

        if (!parentNode) {
            return undefined;
        }

        return parentNode;
    }

    getParentId(nodeId: NodeId): NodeId | undefined {
        const node = this.safeGetNode(nodeId);
        if (!node) {
            return undefined;
        }

        const parentNode = this.safeGetNode(node.parentId);
        if (!parentNode) {
            return undefined;
        }

        return parentNode.id;
    }

    getRootId() {
        return this.rootNodeId;
    }

    getRootNode() {
        return this._getNode(this.rootNodeId);
    }
}
