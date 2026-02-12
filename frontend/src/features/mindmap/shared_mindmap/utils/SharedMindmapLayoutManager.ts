import SharedTreeContainer from "@/features/mindmap/shared_mindmap/utils/SharedTreeContainer";
import { NodeElement, NodeId } from "@/features/mindmap/types/mindmap";
import { calcPartitionIndex } from "@/utils/calc_partition";
import { isSame } from "@/utils/is_same";

type LayoutConfig = {
    xGap: number;
    yGap: number;
};

type PartitionDirection = "right" | "left";

export default class SharedMindmapLayoutManager {
    private config: LayoutConfig;
    private subtreeHeightCache: Map<NodeId, number>;

    constructor(config?: Partial<LayoutConfig>) {
        const defaultConfig: LayoutConfig = {
            xGap: 200,
            yGap: 16,
        };

        this.config = { ...defaultConfig, ...config };
        this.subtreeHeightCache = new Map();
    }

    public invalidate(nodeId: NodeId, container: SharedTreeContainer) {
        let currentId: NodeId | undefined = nodeId;

        while (currentId) {
            this.subtreeHeightCache.delete(currentId);

            const parentNode = container.safeGetParentNode(currentId);
            if (!parentNode) {
                break;
            }

            currentId = parentNode.id;
        }
    }

    public calculateLayout(
        container: SharedTreeContainer,
        rootCenterX: number = 0,
        rootCenterY: number = 0,
    ): Map<NodeId, Partial<NodeElement>> {
        const rootId = container.getRootId();
        const rootNode = container.safeGetNode(rootId);

        const updates: Map<NodeId, Partial<NodeElement>> = new Map();

        if (!rootNode) {
            return updates;
        }

        const realX = rootCenterX - rootNode.width / 2;
        const realY = rootCenterY - rootNode.height / 2;

        if (!isSame(rootNode.x, realX) || !isSame(rootNode.y, realY)) {
            updates.set(rootId, { x: realX, y: realY });
        }

        const childNodes = container.getChildNodes(rootId);
        if (childNodes.length === 0) {
            return updates;
        }

        const { leftGroup, rightGroup } = this.getPartition(childNodes, container);

        this.layoutPartition({
            container,
            parentNode: rootNode,
            partition: rightGroup,
            parentRealX: realX,
            parentRealY: realY,
            direction: "right",
            updates,
        });

        this.layoutPartition({
            container,
            parentNode: rootNode,
            partition: leftGroup,
            parentRealX: realX,
            parentRealY: realY,
            direction: "left",
            updates,
        });

        return updates;
    }

    private getPartition(childNodes: NodeElement[], container: SharedTreeContainer) {
        const heightArr = childNodes.map((node) => this.getSubTreeHeight(node, container));
        const partitionIndex = calcPartitionIndex(heightArr);

        return {
            rightGroup: childNodes.slice(0, partitionIndex),
            leftGroup: childNodes.slice(partitionIndex),
        };
    }

    private getSubTreeHeight(node: NodeElement, container: SharedTreeContainer): number {
        if (this.subtreeHeightCache.has(node.id)) {
            return this.subtreeHeightCache.get(node.id)!;
        }

        const childNodes = container.getChildNodes(node.id);
        let calculatedHeight = 0;

        if (childNodes.length === 0) {
            calculatedHeight = node.height;
        } else {
            const gapHeight = (childNodes.length - 1) * this.config.yGap;
            const childrenHeightSum = childNodes.reduce(
                (acc, child) => acc + this.getSubTreeHeight(child, container),
                gapHeight,
            );

            calculatedHeight = Math.max(node.height, childrenHeightSum);
        }

        this.subtreeHeightCache.set(node.id, calculatedHeight);

        return calculatedHeight;
    }

    private layoutPartition({
        container,
        parentNode,
        partition,
        parentRealX,
        parentRealY,
        direction,
        updates,
    }: {
        container: SharedTreeContainer;
        parentNode: NodeElement;
        partition: NodeElement[];
        parentRealX: number;
        parentRealY: number;
        direction: PartitionDirection;
        updates: Map<NodeId, Partial<NodeElement>>;
    }) {
        if (partition.length === 0) {
            return;
        }

        const partitionHeight = this.calcPartitionHeightWithGap(partition, container);
        let currentY = parentRealY + parentNode.height / 2 - partitionHeight / 2;

        partition.forEach((childNode) => {
            const realX =
                direction === "right"
                    ? parentRealX + parentNode.width + this.config.xGap
                    : parentRealX - childNode.width - this.config.xGap;

            this.layoutSubtree({
                container,
                curNode: childNode,
                x: realX,
                startY: currentY,
                direction,
                updates,
            });

            currentY += this.getSubTreeHeight(childNode, container) + this.config.yGap;
        });
    }

    private layoutSubtree({
        container,
        curNode,
        x,
        startY,
        direction,
        updates,
    }: {
        container: SharedTreeContainer;
        curNode: NodeElement;
        x: number;
        startY: number;
        direction: PartitionDirection;
        updates: Map<NodeId, Partial<NodeElement>>;
    }) {
        const subtreeHeight = this.getSubTreeHeight(curNode, container);
        const newNodeY = startY - curNode.height / 2 + subtreeHeight / 2;

        if (!isSame(curNode.x, x) || !isSame(curNode.y, newNodeY)) {
            updates.set(curNode.id, { x, y: newNodeY });
        }

        const childNodes = container.getChildNodes(curNode.id);
        if (childNodes.length === 0) {
            return;
        }

        const childGroupHeight = this.calcPartitionHeightWithGap(childNodes, container);
        let currentChildY = newNodeY + curNode.height / 2 - childGroupHeight / 2;

        childNodes.forEach((childNode) => {
            const nextX =
                direction === "right" ? x + curNode.width + this.config.xGap : x - childNode.width - this.config.xGap;

            this.layoutSubtree({
                container,
                curNode: childNode,
                x: nextX,
                startY: currentChildY,
                direction,
                updates,
            });

            currentChildY += this.getSubTreeHeight(childNode, container) + this.config.yGap;
        });
    }

    private calcPartitionHeightWithGap(partition: NodeElement[], container: SharedTreeContainer) {
        if (partition.length === 0) {
            return 0;
        }

        console.log(partition);

        const totalGap = this.config.yGap * (partition.length - 1);
        const totalNodesHeight = partition.reduce(
            (acc, node) => acc + this.getSubTreeHeight(node, container),
            totalGap,
        );

        return totalNodesHeight;
    }
}
