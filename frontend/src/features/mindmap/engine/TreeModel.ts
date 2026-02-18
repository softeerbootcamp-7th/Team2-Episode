import { TreeAdapter } from "@/features/mindmap/engine/types";
import { ROOT_NODE_ID } from "@/features/mindmap/engine/YjsAdaptor";
import type {
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
const DETACHED_NODE_PARENT_ID = "detached";

type RootChildPointers = {
    firstChildIdLeft?: NodeId | null;
    lastChildIdLeft?: NodeId | null;
    firstChildIdRight?: NodeId | null;
    lastChildIdRight?: NodeId | null;
};

type RootNodeElement = NodeElement & { type: "root" } & RootChildPointers;
type NodePatch = Partial<Omit<NodeElement, "id">> & RootChildPointers;

function isRootNode(node: NodeElement): node is RootNodeElement {
    return node.type === "root";
}

export class TreeModel {
    constructor(private adapter: TreeAdapter) {}

    // ---- snapshot ----
    get nodes(): Map<NodeId, NodeElement> {
        return this.adapter.getMap();
    }

    transact(fn: () => void, origin?: unknown) {
        this.adapter.transact(fn, origin);
    }

    getRootId(): NodeId {
        return ROOT_NODE_ID;
    }

    getRootNode(): NodeElement {
        const root = this.adapter.get(ROOT_NODE_ID);
        if (!root) throw new Error("Root node missing");
        return root;
    }

    safeGetNode(nodeId: NodeId) {
        return this.adapter.get(nodeId);
    }

    private getNode(nodeId: NodeId): NodeElement {
        const n = this.adapter.get(nodeId);
        if (!n) throw new Error(`Node not found: ${nodeId}`);
        return n;
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

    // ---- root/normal child pointer helpers ----
    private getFirstChildId(parent: NodeElement, side?: AddNodeDirection): NodeId | null {
        if (!isRootNode(parent)) return parent.firstChildId ?? null;
        if (side === "left") return parent.firstChildIdLeft ?? null;
        if (side === "right") return parent.firstChildIdRight ?? null;
        return parent.firstChildId ?? null;
    }

    private getLastChildId(parent: NodeElement, side?: AddNodeDirection): NodeId | null {
        if (!isRootNode(parent)) return parent.lastChildId ?? null;
        if (side === "left") return parent.lastChildIdLeft ?? null;
        if (side === "right") return parent.lastChildIdRight ?? null;
        return parent.lastChildId ?? null;
    }

    private setFirstChildId(parent: NodeElement, value: NodeId | null, side?: AddNodeDirection) {
        if (!isRootNode(parent)) {
            this.patchNode(parent.id, { firstChildId: value });
            return;
        }
        if (side === "left") this.patchNode(parent.id, { firstChildIdLeft: value });
        else if (side === "right") this.patchNode(parent.id, { firstChildIdRight: value });
        else this.patchNode(parent.id, { firstChildId: value });
    }

    private setLastChildId(parent: NodeElement, value: NodeId | null, side?: AddNodeDirection) {
        if (!isRootNode(parent)) {
            this.patchNode(parent.id, { lastChildId: value });
            return;
        }
        if (side === "left") this.patchNode(parent.id, { lastChildIdLeft: value });
        else if (side === "right") this.patchNode(parent.id, { lastChildIdRight: value });
        else this.patchNode(parent.id, { lastChildId: value });
    }

    // ---- update primitives ----
    private patchNode(nodeId: NodeId, patch: NodePatch) {
        const prev = this.getNode(nodeId);
        const next = { ...prev, ...patch, id: nodeId };
        this.adapter.set(nodeId, next);
    }

    update(nodeId: NodeId, newNodeData: Partial<Omit<NodeElement, "id">>) {
        this.patchNode(nodeId, newNodeData);
    }

    private updateSubtreeDirection(nodeId: NodeId, direction: AddNodeDirection) {
        const traverse = (id: NodeId) => {
            const node = this.safeGetNode(id);
            if (!node) return;

            // 방향이 다를 때만 업데이트 (불필요한 연산 방지)
            if (node.addNodeDirection !== direction) {
                this.patchNode(id, { addNodeDirection: direction });
            }

            // 자식들도 찾아서 재귀 호출
            const children = this.getChildIds(id);
            children.forEach(traverse);
        };
        traverse(nodeId);
    }

    private generateNewNodeElement({
        nodeData = { contents: "" },
        type = "normal",
        addNodeDirection = "right",
    }: {
        nodeData?: NodeData;
        type?: NodeType;
        addNodeDirection?: AddNodeDirection;
    }) {
        const id = generateId();

        const node: NodeElement & RootChildPointers = {
            id,
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

        this.adapter.set(id, node);
        return node;
    }

    // ---- sibling insertion ----
    private attachNext(baseNode: NodeElement, movingNode: NodeElement) {
        const parentNode = this.getNode(baseNode.parentId);
        const side = parentNode.type === "root" ? baseNode.addNodeDirection : undefined;

        // ✅ [Fix 2 적용] 어디에 붙든, 형제 노드의 방향을 따라감 (하위 노드까지 싹 다)
        this.updateSubtreeDirection(movingNode.id, baseNode.addNodeDirection);

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

    private attachPrev(baseNode: NodeElement, movingNode: NodeElement) {
        const parentNode = this.getNode(baseNode.parentId);
        const side = parentNode.type === "root" ? baseNode.addNodeDirection : undefined;

        // ✅ [Fix 2 적용]
        this.updateSubtreeDirection(movingNode.id, baseNode.addNodeDirection);

        this.patchNode(movingNode.id, {
            parentId: baseNode.parentId,
            nextId: baseNode.id,
            prevId: baseNode.prevId,
        });

        if (baseNode.prevId) {
            this.patchNode(baseNode.prevId, { nextId: movingNode.id });
        }

        this.patchNode(baseNode.id, { prevId: movingNode.id });

        if (this.getFirstChildId(parentNode, side) === baseNode.id) {
            this.setFirstChildId(parentNode, movingNode.id, side);
        }
    }
    private detach(node: NodeElement) {
        if (node.type === "root") throw new Error("Cannot detach root node");

        const parentNode = this.getNode(node.parentId);
        const side = parentNode.type === "root" ? node.addNodeDirection : undefined;

        if (this.getFirstChildId(parentNode, side) === node.id) {
            this.setFirstChildId(parentNode, node.nextId ?? null, side);
        }
        if (this.getLastChildId(parentNode, side) === node.id) {
            this.setLastChildId(parentNode, node.prevId ?? null, side);
        }

        if (node.prevId) this.patchNode(node.prevId, { nextId: node.nextId });
        if (node.nextId) this.patchNode(node.nextId, { prevId: node.prevId });

        this.patchNode(node.id, {
            prevId: null,
            nextId: null,
            parentId: DETACHED_NODE_PARENT_ID,
        });
    }

    // ---- append child ----
    appendChild(args: { parentNodeId: NodeId; childNodeId?: NodeId; addNodeDirection?: AddNodeDirection }) {
        const { parentNodeId, childNodeId, addNodeDirection } = args;

        const parentNode = this.getNode(parentNodeId);

        const childNode = childNodeId
            ? this.getNode(childNodeId)
            : this.generateNewNodeElement({
                  addNodeDirection:
                      parentNode.type === "root" ? addNodeDirection || "right" : parentNode.addNodeDirection,
              });

        const finalDir: AddNodeDirection =
            parentNode.type === "root"
                ? addNodeDirection || childNode.addNodeDirection || "right"
                : parentNode.addNodeDirection;

        // ✅ [Fix 2 적용] childNode patch 시 addNodeDirection을 직접 넣는 대신, 재귀 함수 사용
        this.patchNode(childNode.id, {
            parentId: parentNodeId,
            // addNodeDirection: finalDir, // <-- 삭제 (아래 함수가 대신 함)
        });
        this.updateSubtreeDirection(childNode.id, finalDir);

        const side = parentNode.type === "root" ? finalDir : undefined;
        const lastChildId = this.getLastChildId(parentNode, side);

        if (lastChildId) {
            this.patchNode(lastChildId, { nextId: childNode.id });
            this.patchNode(childNode.id, { prevId: lastChildId, nextId: null });
            this.setLastChildId(parentNode, childNode.id, side);
        } else {
            this.setFirstChildId(parentNode, childNode.id, side);
            this.setLastChildId(parentNode, childNode.id, side);
            this.patchNode(childNode.id, { prevId: null, nextId: null });
        }
    }

    // ... attachTo 유지 ...

    // ---- public CRUD ----
    attachTo(args: { baseNodeId: NodeId; direction: NodeDirection; addNodeDirection: AddNodeDirection }): NodeId {
        const { baseNodeId, direction, addNodeDirection } = args;

        const baseNode = this.getNode(baseNodeId);

        if (baseNode.type === "root" && direction !== "child") {
            throw new Error("Cannot add sibling to root");
        }

        const newNode = this.generateNewNodeElement({ addNodeDirection });

        switch (direction) {
            case "next":
                this.attachNext(baseNode, newNode);
                break;
            case "prev":
                this.attachPrev(baseNode, newNode);
                break;
            case "child":
                this.appendChild({ parentNodeId: baseNode.id, childNodeId: newNode.id, addNodeDirection });
                break;
            default:
                exhaustiveCheck(direction);
        }

        return newNode.id;
    }

    moveTo(args: {
        baseNodeId: NodeId;
        movingNodeId: NodeId;
        direction: NodeDirection;
        addNodeDirection?: AddNodeDirection;
    }) {
        const { baseNodeId, movingNodeId, direction, addNodeDirection } = args;

        if (baseNodeId === movingNodeId) return;
        if (direction === "child" && baseNodeId === movingNodeId) return;

        // 주의: 여기서 가져온 baseNode는 detach() 실행 전의 상태임 (stale data)
        const initialBaseNode = this.getNode(baseNodeId);
        const movingNode = this.getNode(movingNodeId);

        // Ancestor Check
        const checkNodeId = direction === "child" ? initialBaseNode.id : initialBaseNode.parentId;
        let temp = this.safeGetNode(checkNodeId);
        while (temp) {
            if (temp.id === movingNodeId) throw new Error("Cannot move under descendant");
            if (temp.type === "root") break;
            temp = this.safeGetNode(temp.parentId);
        }

        // 1. 링크 끊기 (이 과정에서 인접 노드들의 nextId/prevId가 변경될 수 있음)
        this.detach(movingNode);

        // 2. ✅ baseNode 다시 가져오기 (매우 중요)
        // 같은 리스트 내에서 이동하는 경우, detach로 인해 baseNode의 nextId/prevId가 바뀌었을 수 있음.
        // 이를 갱신하지 않고 attach를 수행하면 꼬인 링크(구버전 nextId)를 다시 연결하여 순환 루프 발생.
        const freshBaseNode = this.getNode(baseNodeId);

        // movingNode도 detach 되면서 상태가 변했으므로 다시 가져옴
        const freshMovingNode = this.getNode(movingNodeId);

        switch (direction) {
            case "next":
                this.attachNext(freshBaseNode, freshMovingNode);
                break;
            case "prev":
                this.attachPrev(freshBaseNode, freshMovingNode);
                break;
            case "child":
                this.appendChild({ parentNodeId: freshBaseNode.id, childNodeId: freshMovingNode.id, addNodeDirection });
                break;
            default:
                exhaustiveCheck(direction);
        }
    }

    delete(nodeId: NodeId) {
        const node = this.getNode(nodeId);
        if (node.type === "root") throw new Error("Cannot delete root");

        // unlink from parent list
        const parent = this.getNode(node.parentId);
        const side = parent.type === "root" ? node.addNodeDirection : undefined;

        if (this.getFirstChildId(parent, side) === node.id) this.setFirstChildId(parent, node.nextId ?? null, side);
        if (this.getLastChildId(parent, side) === node.id) this.setLastChildId(parent, node.prevId ?? null, side);

        if (node.prevId) this.patchNode(node.prevId, { nextId: node.nextId });
        if (node.nextId) this.patchNode(node.nextId, { prevId: node.prevId });

        // delete subtree
        this.deleteTraverse(node.id);
    }

    private deleteTraverse(nodeId: NodeId) {
        const node = this.safeGetNode(nodeId);
        if (!node) return;

        const childIds = this.getChildIds(nodeId);
        for (const cid of childIds) {
            this.deleteTraverse(cid);
        }
        this.adapter.delete(nodeId);
    }

    // ---- queries ----
    private collectFromList(startId: NodeId | null, out: NodeId[]) {
        let cur = startId;
        let guard = 0; // 안전장치

        while (cur) {
            // 1만 번 이상 루프를 돌면 비정상 상황으로 간주하고 탈출
            if (guard++ > 10000) {
                console.error(`[TreeModel] Loop detected or list too long at ${cur}`);
                break;
            }
            out.push(cur);
            const n = this.safeGetNode(cur);
            if (!n) break;
            cur = n.nextId ?? null;
        }
    }

    getChildIds(nodeId: NodeId): NodeId[] {
        const node = this.safeGetNode(nodeId);
        if (!node) return [];

        if (isRootNode(node)) {
            const ids: NodeId[] = [];
            const rightStart = node.firstChildIdRight ?? null;
            const leftStart = node.firstChildIdLeft ?? null;

            if (rightStart) this.collectFromList(rightStart, ids);
            if (leftStart) this.collectFromList(leftStart, ids);

            // fallback: legacy single list
            if (!rightStart && !leftStart) this.collectFromList(node.firstChildId ?? null, ids);

            return ids;
        }

        const ids: NodeId[] = [];
        this.collectFromList(node.firstChildId ?? null, ids);
        return ids;
    }

    getChildNodes(parentNodeId: NodeId): NodeElement[] {
        const ids = this.getChildIds(parentNodeId);
        const out: NodeElement[] = [];
        for (const id of ids) {
            const n = this.safeGetNode(id);
            if (n) out.push(n);
        }
        return out;
    }

    getAllDescendantIds(nodeId: NodeId): Set<NodeId> {
        const out = new Set<NodeId>();
        const walk = (id: NodeId) => {
            out.add(id);
            for (const c of this.getChildIds(id)) walk(c);
        };
        walk(nodeId);
        return out;
    }
}
