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
            nodeData: { contents: name },
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

    /**
     * ✅ root/normal 공통 유틸: 부모의 child list 포인터를 side까지 고려해서 읽고/쓰기
     * - normal: firstChildId/lastChildId 사용
     * - root: firstChildIdLeft/Right, lastChildIdLeft/Right 사용
     */
    private getFirstChildId(parent: NodeElement, side?: AddNodeDirection): NodeId | null {
        if (parent.type !== "root") return parent.firstChildId;

        if (side === "left") return parent.firstChildIdLeft ?? null;
        if (side === "right") return parent.firstChildIdRight ?? null;

        // (정상 로직에선 root면 side가 항상 있어야 함)
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
            parent.firstChildId = value;
            return;
        }
        if (side === "left") parent.firstChildIdLeft = value;
        else if (side === "right") parent.firstChildIdRight = value;
        else parent.firstChildId = value; // legacy fallback
    }

    private setLastChildId(parent: NodeElement, value: NodeId | null, side?: AddNodeDirection) {
        if (parent.type !== "root") {
            parent.lastChildId = value;
            return;
        }
        if (side === "left") parent.lastChildIdLeft = value;
        else if (side === "right") parent.lastChildIdRight = value;
        else parent.lastChildId = value; // legacy fallback
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

        this.addNodeToContainer(node);
        return node;
    }

    private addNodeToContainer(node: NodeElement) {
        this.nodes.set(node.id, node);
    }

    private attachNext({ baseNode, movingNode }: { baseNode: NodeElement; movingNode: NodeElement }) {
        movingNode.parentId = baseNode.parentId;

        const parentNode = this._getNode(baseNode.parentId);
        const side = parentNode.type === "root" ? baseNode.addNodeDirection : undefined;

        // ✅ root의 sibling insertion이면 side 강제 동기화
        if (parentNode.type === "root") {
            movingNode.addNodeDirection = baseNode.addNodeDirection;
        }

        movingNode.prevId = baseNode.id;
        movingNode.nextId = baseNode.nextId;

        if (baseNode.nextId) {
            const nextSibling = this._getNode(baseNode.nextId);
            nextSibling.prevId = movingNode.id;
        }

        baseNode.nextId = movingNode.id;

        // ✅ root면 side별 lastChildId 갱신
        if (this.getLastChildId(parentNode, side) === baseNode.id) {
            this.setLastChildId(parentNode, movingNode.id, side);
        } else if (parentNode.type !== "root") {
            // normal은 기존 로직 유지
            if (parentNode.lastChildId === baseNode.id) {
                parentNode.lastChildId = movingNode.id;
            }
        }
    }

    private attachPrev({ baseNode, movingNode }: { baseNode: NodeElement; movingNode: NodeElement }) {
        movingNode.parentId = baseNode.parentId;

        const parentNode = this._getNode(baseNode.parentId);
        const side = parentNode.type === "root" ? baseNode.addNodeDirection : undefined;

        // ✅ root의 sibling insertion이면 side 강제 동기화
        if (parentNode.type === "root") {
            movingNode.addNodeDirection = baseNode.addNodeDirection;
        }

        movingNode.nextId = baseNode.id;
        movingNode.prevId = baseNode.prevId;

        if (baseNode.prevId) {
            const prevSibling = this._getNode(baseNode.prevId);
            prevSibling.nextId = movingNode.id;
        }

        baseNode.prevId = movingNode.id;

        // ✅ root면 side별 firstChildId 갱신
        if (this.getFirstChildId(parentNode, side) === baseNode.id) {
            this.setFirstChildId(parentNode, movingNode.id, side);
        } else if (parentNode.type !== "root") {
            if (parentNode.firstChildId === baseNode.id) {
                parentNode.firstChildId = movingNode.id;
            }
        }
    }

    private detach({ node }: { node: NodeElement }) {
        if (node.type === "root") {
            throw new Error("루트 노드는 뗄 수 없습니다.");
        }

        const parentNode = this._getNode(node.parentId);
        const side = parentNode.type === "root" ? node.addNodeDirection : undefined;

        // ✅ 부모 포인터 갱신 (root면 side별)
        if (this.getFirstChildId(parentNode, side) === node.id) {
            this.setFirstChildId(parentNode, node.nextId, side);
        }
        if (this.getLastChildId(parentNode, side) === node.id) {
            this.setLastChildId(parentNode, node.prevId, side);
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
        addNodeDirection, // ✅ root child 이동 시 필요
    }: {
        baseNodeId: NodeId;
        movingNodeId: NodeId;
        direction: NodeDirection;
        addNodeDirection?: AddNodeDirection;
    }) {
        if (direction === "child" && baseNodeId === movingNodeId) return;
        if (baseNodeId === movingNodeId) return;

        try {
            const baseNode = this._getNode(baseNodeId);
            const movingNode = this._getNode(movingNodeId);

            let checkNodeId = baseNode.id;
            if (direction !== "child") checkNodeId = baseNode.parentId;

            // drop한 곳에서 위로 가면서 movingNode가 있는지 확인
            let tempParent = this.safeGetNode(checkNodeId);
            while (tempParent) {
                if (tempParent.id === movingNodeId) throw new Error("자손 밑으로 이동 불가");
                if (tempParent.type === "root") break;
                tempParent = this.safeGetNode(tempParent.parentId);
            }

            // ✅ detach는 "현재 side" 기준으로 해야 하므로, side 변경은 detach 이후에 일어나야 함
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
                        addNodeDirection, // ✅ root면 여기서 side를 적용
                    });
                    break;
                default:
                    exhaustiveCheck(`${direction} 방향은 불가능합니다.`);
            }
        } catch (e) {
            if (e instanceof Error) console.error(e.message);
            else console.error(String(e));

            if (this.isThrowError) throw e;
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
                addNodeDirection,
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
                        addNodeDirection,
                    });
                    break;
                default:
                    exhaustiveCheck(`${direction} 방향은 불가능합니다.`);
            }

            return newNode.id;
        } catch (e) {
            if (e instanceof Error) console.error(e.message);
            else console.error(String(e));

            if (this.isThrowError) throw e;
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

            // 노드 생성 (또는 기존 노드 가져오기)
            const childNode = cId
                ? this._getNode(cId)
                : this.generateNewNodeElement({
                      addNodeDirection:
                          parentNode.type === "root" ? addNodeDirection || "right" : parentNode.addNodeDirection,
                  });

            // ✅ 최종 side 결정:
            // - root: addNodeDirection(드롭/버튼) 우선, 없으면 child의 기존 방향 유지, 최후 default right
            // - normal: 부모 방향 상속
            const finalDirection =
                parentNode.type === "root"
                    ? addNodeDirection || childNode.addNodeDirection || "right"
                    : parentNode.addNodeDirection;

            childNode.parentId = parentNodeId;
            childNode.addNodeDirection = finalDirection;

            const side = parentNode.type === "root" ? finalDirection : undefined;

            // [Double Linked List 연결: 항상 맨 뒤에 추가] (root는 side별 리스트)
            const lastChildId = this.getLastChildId(parentNode, side);

            if (lastChildId) {
                const lastNode = this._getNode(lastChildId);

                lastNode.nextId = childNode.id;
                childNode.prevId = lastNode.id;

                this.setLastChildId(parentNode, childNode.id, side);
                childNode.nextId = null;
            } else {
                this.setFirstChildId(parentNode, childNode.id, side);
                this.setLastChildId(parentNode, childNode.id, side);

                childNode.prevId = null;
                childNode.nextId = null;
            }
        } catch (e) {
            if (e instanceof Error) console.error(e.message);
            else console.error(String(e));
            if (this.isThrowError) throw e;
        }
    }

    delete({ nodeId }: { nodeId: NodeId }) {
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

            if (node.prevId) this._getNode(node.prevId).nextId = node.nextId;
            if (node.nextId) this._getNode(node.nextId).prevId = node.prevId;

            this._deleteTraverse({ nodeId });
        } catch (e) {
            if (e instanceof Error) console.error(e.message);
            else console.error(String(e));
            if (this.isThrowError) throw e;
        }
    }

    update({ nodeId, newNodeData }: { nodeId: NodeId; newNodeData: Partial<Omit<NodeElement, "id">> }) {
        try {
            const oldNode = this._getNode(nodeId);
            const newNodeElement: NodeElement = { ...oldNode, ...newNodeData, id: nodeId };
            this.addNodeToContainer(newNodeElement);
        } catch (e) {
            if (e instanceof Error) console.error(e.message);
            else console.error(String(e));
            if (this.isThrowError) throw e;
        }
    }

    // ===== 조회 / 탐색 ====== //

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

        // ✅ root는 right 리스트 + left 리스트 합쳐서 반환
        if (node.type === "root") {
            const ids: NodeId[] = [];
            this.collectChildIdsFromList(node.firstChildIdRight ?? null, ids);
            this.collectChildIdsFromList(node.firstChildIdLeft ?? null, ids);
            return ids;
        }

        // normal: 기존 single list
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

    safeGetNode(nodeId: NodeId) {
        return this.nodes.get(nodeId);
    }

    safeGetParentNode(nodeId: NodeId) {
        const node = this.safeGetNode(nodeId);
        if (!node) return undefined;

        const parentNode = this.safeGetNode(node.parentId);
        if (!parentNode) return undefined;

        return parentNode;
    }

    getParentId(nodeId: NodeId): NodeId | undefined {
        const node = this.safeGetNode(nodeId);
        if (!node) return undefined;

        const parentNode = this.safeGetNode(node.parentId);
        if (!parentNode) return undefined;

        return parentNode.id;
    }

    getRootId() {
        return this.rootNodeId;
    }

    getRootNode() {
        return this._getNode(this.rootNodeId);
    }

    // ✅ MindmapTree 인터페이스 호환용
    transact(fn: () => void) {
        fn();
    }

    destroy() {
        // no-op
    }
}
