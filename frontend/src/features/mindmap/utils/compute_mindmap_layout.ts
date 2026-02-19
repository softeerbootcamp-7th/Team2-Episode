import type { AddNodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";

export type LayoutConfig = {
    xGap: number;
    yGap: number;
    defaultNodeWidth: number;

    defaultNodeHeight: number;
};

export type LayoutPatch = {
    nodeId: NodeId;
    patch: Partial<Pick<NodeElement, "x" | "y">>;
};

type RootChildPointers = {
    firstChildIdLeft?: NodeId | null;
    firstChildIdRight?: NodeId | null;
};

type RootNodeElement = NodeElement & { type: "root" } & RootChildPointers;

function isRootNode(node: NodeElement): node is RootNodeElement {
    return node.type === "root";
}

const DEFAULT_CONFIG: LayoutConfig = {
    xGap: 100,
    yGap: 16,
    defaultNodeWidth: 200,
    defaultNodeHeight: 60,
};

type PartitionDirection = "left" | "right";

type LayoutInput = {
    nodes: Map<NodeId, NodeElement>;
    rootId: NodeId;
    config?: Partial<LayoutConfig>;
};

/**
 * - nodes를 읽기만 하고 변경하지 않음
 * - (x,y) 변경이 필요한 노드들에 대한 patch 리스트를 반환
 */
export function computeMindmapLayout(input: LayoutInput): LayoutPatch[] {
    const { nodes, rootId } = input;
    const config: LayoutConfig = { ...DEFAULT_CONFIG, ...(input.config ?? {}) };

    const root = nodes.get(rootId);
    if (!root) return [];

    const patches: LayoutPatch[] = [];
    const subtreeHeightMemo = new Map<NodeId, number>();

    const effW = (n: NodeElement) => (n.width > 0 ? n.width : config.defaultNodeWidth);
    const effH = (n: NodeElement) => (n.height > 0 ? n.height : config.defaultNodeHeight);

    const collectFromList = (startId: NodeId | null): NodeId[] => {
        const out: NodeId[] = [];
        let cur: NodeId | null = startId;
        while (cur) {
            out.push(cur);
            const n = nodes.get(cur);
            if (!n) break;
            cur = n.nextId ?? null;
        }
        return out;
    };

    const getChildIds = (parent: NodeElement, side?: AddNodeDirection): NodeId[] => {
        if (!isRootNode(parent)) {
            return collectFromList(parent.firstChildId ?? null);
        }

        const rightStart = parent.firstChildIdRight ?? null;
        const leftStart = parent.firstChildIdLeft ?? null;

        if (side === "right") {
            if (rightStart) return collectFromList(rightStart);
            return collectFromList(parent.firstChildId ?? null).filter(
                (id) => nodes.get(id)?.addNodeDirection === "right",
            );
        }

        if (side === "left") {
            if (leftStart) return collectFromList(leftStart);
            return collectFromList(parent.firstChildId ?? null).filter(
                (id) => nodes.get(id)?.addNodeDirection === "left",
            );
        }

        const rightIds = rightStart
            ? collectFromList(rightStart)
            : collectFromList(parent.firstChildId ?? null).filter((id) => nodes.get(id)?.addNodeDirection === "right");

        const leftIds = leftStart
            ? collectFromList(leftStart)
            : collectFromList(parent.firstChildId ?? null).filter((id) => nodes.get(id)?.addNodeDirection === "left");

        return [...rightIds, ...leftIds];
    };

    const getChildNodes = (parent: NodeElement, side?: AddNodeDirection): NodeElement[] => {
        const ids = getChildIds(parent, side);
        const out: NodeElement[] = [];
        for (const id of ids) {
            const n = nodes.get(id);
            if (n) out.push(n);
        }
        return out;
    };

    const getSubtreeHeight = (node: NodeElement): number => {
        const cached = subtreeHeightMemo.get(node.id);
        if (cached !== undefined) return cached;

        const children = getChildNodes(node);
        let result: number;

        if (children.length === 0) {
            result = effH(node);
        } else {
            const gap = (children.length - 1) * config.yGap;
            const sum = children.reduce((acc, c) => acc + getSubtreeHeight(c), 0);
            result = Math.max(effH(node), sum + gap);
        }

        subtreeHeightMemo.set(node.id, result);
        return result;
    };

    const calcPartitionHeightWithGap = (partition: NodeElement[]) => {
        if (partition.length === 0) return 0;
        const totalGap = config.yGap * (partition.length - 1);
        return partition.reduce((acc, n) => acc + getSubtreeHeight(n), totalGap);
    };

    const pushXYIfChanged = (node: NodeElement, x: number, y: number) => {
        if (node.x === x && node.y === y) return;
        patches.push({ nodeId: node.id, patch: { x, y } });
    };

    const layoutSubtree = (curNode: NodeElement, centerX: number, startY: number, direction: PartitionDirection) => {
        const subtreeH = getSubtreeHeight(curNode);
        const centerY = startY + subtreeH / 2;

        pushXYIfChanged(curNode, centerX, centerY);

        const children = getChildNodes(curNode);
        if (children.length === 0) return;

        const groupH = calcPartitionHeightWithGap(children);
        let childStartY = centerY - groupH / 2;

        const curW = effW(curNode);

        for (const child of children) {
            const childW = effW(child);

            const nextX =
                direction === "right"
                    ? centerX + curW / 2 + config.xGap + childW / 2
                    : centerX - curW / 2 - config.xGap - childW / 2;

            layoutSubtree(child, nextX, childStartY, direction);
            childStartY += getSubtreeHeight(child) + config.yGap;
        }
    };

    const layoutPartition = (parentNode: NodeElement, partition: NodeElement[], direction: PartitionDirection) => {
        if (partition.length === 0) return;

        const partH = calcPartitionHeightWithGap(partition);
        let startY = parentNode.y - partH / 2;

        const parentW = effW(parentNode);

        for (const child of partition) {
            const childW = effW(child);

            const childX =
                direction === "right"
                    ? parentNode.x + parentW / 2 + config.xGap + childW / 2
                    : parentNode.x - parentW / 2 - config.xGap - childW / 2;

            layoutSubtree(child, childX, startY, direction);
            startY += getSubtreeHeight(child) + config.yGap;
        }
    };

    pushXYIfChanged(root, 0, 0);

    const rightGroup = getChildNodes(root, "right");
    const leftGroup = getChildNodes(root, "left");

    layoutPartition(root, rightGroup, "right");
    layoutPartition(root, leftGroup, "left");

    return patches;
}
