import TreeContainer from "@/features/mindmap/core/TreeContainer";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";
import { CacheMap } from "@/utils/CacheMap";
import { isSame } from "@/utils/is_same";

type LayoutConfig = {
    xGap: number;
    yGap: number;
};

type PartitionDirection = "right" | "left";

export default class MindmapLayoutManager {
    private treeContainer: TreeContainer;
    private config: LayoutConfig;
    private subtreeHeightCache: CacheMap<NodeId, number>;

    constructor({ treeContainer, config = {} }: { treeContainer: TreeContainer; config?: Partial<LayoutConfig> }) {
        const defaultConfig: LayoutConfig = {
            xGap: 100,
            yGap: 16,
        };

        this.treeContainer = treeContainer;
        this.config = { ...defaultConfig, ...config };
        this.subtreeHeightCache = new CacheMap();
    }

    /** 캐시 무효화 : 특정 노드 변경 시 상위 부모들의 높이 계산 초기화 */
    public invalidate(nodeId: NodeId) {
        let currentId: NodeId | undefined = nodeId;

        while (currentId) {
            this.subtreeHeightCache.delete(currentId);

            const parentNode = this.treeContainer.safeGetParentNode(currentId);
            if (!parentNode) {
                break;
            }

            currentId = parentNode.id;
        }
    }

    public updateLayout({
        rootId,
        rootCenterX = 0,
        rootCenterY = 0,
    }: {
        rootId: NodeId;
        rootCenterX?: number;
        rootCenterY?: number;
    }) {
        const rootNode = this.treeContainer.safeGetNode(rootId);
        if (!rootNode) {
            return;
        }

        const realX = rootCenterX - rootNode.width / 2;
        const realY = rootCenterY - rootNode.height / 2;

        this.treeContainer.update({
            nodeId: rootId,
            newNodeData: { x: realX, y: realY },
        });

        const childNodes = this.treeContainer.getChildNodes(rootId);
        if (childNodes.length === 0) {
            return;
        }

        const { leftGroup, rightGroup } = this.getPartition(childNodes);

        this.layoutPartition({
            parentNode: rootNode,
            partition: rightGroup,
            parentRealX: realX,
            parentRealY: realY,
            direction: "right",
        });

        this.layoutPartition({
            parentNode: rootNode,
            partition: leftGroup,
            parentRealX: realX,
            parentRealY: realY,
            direction: "left",
        });
    }

    // TODO: 좌우 균형 일단 적용 X, 사용자 조작대로만 위치
    private getPartition(childNodes: NodeElement[]) {
        // 1. 데이터에 기반한 필터링 (사용자 의도 존중)
        const currentLeft = childNodes.filter((n) => n.addNodeDirection === "left");
        const currentRight = childNodes.filter((n) => n.addNodeDirection === "right");

        // const leftHeight = this.calcPartitionHeightWithGap(currentLeft);
        // const rightHeight = this.calcPartitionHeightWithGap(currentRight);

        // // 2. 임계치 체크
        // const imbalanceThreshold = 2.0;
        // const ratio = Math.max(leftHeight, rightHeight) / (Math.min(leftHeight, rightHeight) || 1);

        // // 균형이 깨지지 않았다면 사용자의 의도(데이터에 박힌 값)를 그대로 믿고 반환
        // if (ratio <= imbalanceThreshold) {
        //     return {
        //         leftGroup: currentLeft,
        //         rightGroup: currentRight,
        //     };
        // }

        // // 3. 균형이 너무 깨졌을 때만 Rebalancing (여기서 slice 기준을 다시 잡음)
        // const heightArr = childNodes.map((node) => this.getSubTreeHeight(node));
        // const partitionIndex = calcPartitionIndex(heightArr);

        // // 재배치 시: 앞쪽 절반은 오른쪽으로, 뒤쪽 절반은 왼쪽으로 보냄
        // const newRight = childNodes.slice(0, partitionIndex);
        // const newLeft = childNodes.slice(partitionIndex);

        // // 재배치된 노드들의 데이터를 실제 물리적 방향과 동기화 (업데이트)
        // newRight.forEach((n) => {
        //     n.addNodeDirection = "right";
        // });
        // newLeft.forEach((n) => {
        //     n.addNodeDirection = "left";
        // });

        return {
            rightGroup: currentRight,
            leftGroup: currentLeft,
        };
    }

    private getSubTreeHeight(node: NodeElement): number {
        if (this.subtreeHeightCache.has(node.id)) {
            // node.id가 있음이 확실하므로 !로 단언했습니다.
            return this.subtreeHeightCache.get(node.id)!;
        }

        const childNodes = this.treeContainer.getChildNodes(node.id);
        let calculatedHeight = 0;

        if (childNodes.length === 0) {
            calculatedHeight = node.height;
        } else {
            const gapHeight = (childNodes.length - 1) * this.config.yGap;
            const childrenHeightSum = childNodes.reduce((acc, child) => acc + this.getSubTreeHeight(child), gapHeight);

            calculatedHeight = Math.max(node.height, childrenHeightSum);
        }

        this.subtreeHeightCache.set(node.id, calculatedHeight);
        return calculatedHeight;
    }

    private layoutPartition({
        parentNode,
        partition,
        parentRealX,
        parentRealY,
        direction,
    }: {
        parentNode: NodeElement;
        partition: NodeElement[];
        parentRealX: number;
        parentRealY: number;
        direction: PartitionDirection;
    }) {
        if (partition.length === 0) {
            return;
        }

        const partitionHeight = this.calcPartitionHeightWithGap(partition);
        let currentY = parentRealY + parentNode.height / 2 - partitionHeight / 2;

        partition.forEach((childNode) => {
            const realX =
                direction === "right"
                    ? parentRealX + parentNode.width + this.config.xGap
                    : parentRealX - childNode.width - this.config.xGap;

            this.layoutSubtree({ curNode: childNode, x: realX, startY: currentY, direction });

            currentY += this.getSubTreeHeight(childNode) + this.config.yGap;
        });
    }

    private layoutSubtree({
        curNode,
        x,
        startY,
        direction,
    }: {
        curNode: NodeElement;
        x: number;
        startY: number;
        direction: PartitionDirection;
    }) {
        const subtreeHeight = this.getSubTreeHeight(curNode);
        const newNodeY = startY - curNode.height / 2 + subtreeHeight / 2;

        if (!isSame(curNode.x, x) || !isSame(curNode.y, newNodeY) || curNode.addNodeDirection !== direction) {
            this.treeContainer.update({
                nodeId: curNode.id,
                newNodeData: {
                    x,
                    y: newNodeY,
                    // addNodeDirection: direction //좌우 균형 정렬 적용 x
                },
            });
        }

        const childNodes = this.treeContainer.getChildNodes(curNode.id);
        if (childNodes.length === 0) {
            return;
        }

        const childGroupHeight = this.calcPartitionHeightWithGap(childNodes);
        let currentChildY = newNodeY + curNode.height / 2 - childGroupHeight / 2;

        childNodes.forEach((childNode) => {
            const nextX =
                direction === "right" ? x + curNode.width + this.config.xGap : x - childNode.width - this.config.xGap;

            this.layoutSubtree({ curNode: childNode, x: nextX, startY: currentChildY, direction });

            currentChildY += this.getSubTreeHeight(childNode) + this.config.yGap;
        });
    }

    private calcPartitionHeightWithGap(partition: NodeElement[]) {
        if (partition.length === 0) {
            return 0;
        }

        const totalGap = this.config.yGap * (partition.length - 1);
        const totalNodesHeight = partition.reduce((acc, node) => acc + this.getSubTreeHeight(node), totalGap);

        return totalNodesHeight;
    }
}
