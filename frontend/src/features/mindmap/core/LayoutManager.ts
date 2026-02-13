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

    public updateLayout({ rootId }: { rootId: NodeId }) {
        const rootNode = this.treeContainer.safeGetNode(rootId);
        if (!rootNode) {
            return;
        }

        console.log(`[Layout Debug] Root State:`, {
            id: rootId,
            dataX: rootNode.x, // 우리가 기대하는 값은 항상 0 근처 (또는 -w/2)
            dataY: rootNode.y,
            measuredW: rootNode.width, // 👈 이 값이 노드 추가 시 변하는지 확인
            measuredH: rootNode.height,
        });

        rootNode.x = 0;
        rootNode.y = 0;

        const childNodes = this.treeContainer.getChildNodes(rootId);
        if (childNodes.length === 0) {
            return;
        }

        const { leftGroup, rightGroup } = this.getPartition(childNodes);

        this.layoutPartition({
            parentNode: rootNode,
            partition: rightGroup,
            direction: "right",
        });

        this.layoutPartition({
            parentNode: rootNode,
            partition: leftGroup,
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
        // 1. 실제 측정값이 0이라면, 기본 노드 높이(예: 40)를 사용하도록 보정합니다.
        const effectiveNodeHeight = node.height > 0 ? node.height : 60;

        if (this.subtreeHeightCache.has(node.id)) {
            return this.subtreeHeightCache.get(node.id)!;
        }

        const childNodes = this.treeContainer.getChildNodes(node.id);
        let calculatedHeight = 0;

        if (childNodes.length === 0) {
            // 2. 자식이 없는 노드도 0이 아닌 기본 높이를 반환합니다.
            calculatedHeight = effectiveNodeHeight;
        } else {
            const gapHeight = (childNodes.length - 1) * this.config.yGap;
            // 3. 재귀적으로 자식들의 높이를 합산할 때도 0이 나오지 않도록 합니다.
            const childrenHeightSum = childNodes.reduce((acc, child) => acc + this.getSubTreeHeight(child), 0);

            calculatedHeight = Math.max(effectiveNodeHeight, childrenHeightSum + gapHeight);
        }

        this.subtreeHeightCache.set(node.id, calculatedHeight);
        return calculatedHeight;
    }

    private layoutPartition({
        parentNode,
        partition,
        direction,
    }: {
        parentNode: NodeElement;
        partition: NodeElement[];
        direction: PartitionDirection;
    }) {
        if (partition.length === 0) {
            return;
        }

        const partitionHeight = this.calcPartitionHeightWithGap(partition);
        let currentStartY = parentNode.y - partitionHeight / 2;

        partition.forEach((childNode) => {
            const childWidth = childNode.width || 200;

            const childCenterX =
                direction === "right"
                    ? parentNode.x + parentNode.width / 2 + this.config.xGap + childWidth / 2
                    : parentNode.x - parentNode.width / 2 - this.config.xGap - childWidth / 2;

            this.layoutSubtree({
                curNode: childNode,
                centerX: childCenterX,
                startY: currentStartY,
                direction,
            });

            currentStartY += this.getSubTreeHeight(childNode) + this.config.yGap;
        });
    }

    private layoutSubtree({
        curNode,
        centerX,
        startY,
        direction,
    }: {
        curNode: NodeElement;
        centerX: number;
        startY: number;
        direction: PartitionDirection;
    }) {
        const subtreeHeight = this.getSubTreeHeight(curNode);
        const centerY = startY + subtreeHeight / 2;

        if (!isSame(curNode.x, centerX) || !isSame(curNode.y, centerY) || curNode.addNodeDirection !== direction) {
            this.treeContainer.update({
                nodeId: curNode.id,
                newNodeData: {
                    x: centerX,
                    y: centerY,
                    // addNodeDirection: direction //좌우 균형 정렬 적용 x
                },
            });
        }

        const childNodes = this.treeContainer.getChildNodes(curNode.id);
        if (childNodes.length === 0) {
            return;
        }

        const childGroupHeight = this.calcPartitionHeightWithGap(childNodes);
        let currentChildStartY = centerY - childGroupHeight / 2;

        childNodes.forEach((childNode) => {
            const childWidth = childNode.width || 200;

            const nextCenterX =
                direction === "right"
                    ? centerX + curNode.width / 2 + this.config.xGap + childWidth / 2
                    : centerX - curNode.width / 2 - this.config.xGap - childWidth / 2;

            this.layoutSubtree({
                curNode: childNode,
                centerX: nextCenterX,
                startY: currentChildStartY,
                direction,
            });

            currentChildStartY += this.getSubTreeHeight(childNode) + this.config.yGap;
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
