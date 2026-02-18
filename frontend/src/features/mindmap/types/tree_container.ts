import { AddNodeDirection, NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";

export interface TreeContainer {
    nodes: Map<NodeId, NodeElement>;

    /** yjs는 transact로 묶어야 업데이트가 한번에 전파됨 / 로컬은 no-op */
    transact(fn: () => void, origin?: unknown): void;
    destroy?(): void;

    getRootId(): NodeId;
    getRootNode(): NodeElement;

    safeGetNode(nodeId: NodeId): NodeElement | undefined;
    safeGetParentNode(nodeId: NodeId): NodeElement | undefined;
    getParentId(nodeId: NodeId): NodeId | undefined;

    getChildIds(nodeId: NodeId): NodeId[];
    getChildNodes(parentNodeId: NodeId): NodeElement[];
    getAllDescendantIds(nodeId: NodeId): Set<NodeId>;

    moveTo(args: {
        baseNodeId: NodeId;
        movingNodeId: NodeId;
        direction: NodeDirection;
        addNodeDirection?: AddNodeDirection;
    }): void;

    attachTo(args: {
        baseNodeId: NodeId;
        direction: NodeDirection;
        addNodeDirection: AddNodeDirection;
    }): NodeId | undefined;

    delete(args: { nodeId: NodeId }): void;

    update(args: { nodeId: NodeId; newNodeData: Partial<Omit<NodeElement, "id">> }): void;
}
