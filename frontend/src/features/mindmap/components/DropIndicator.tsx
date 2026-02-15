import { edgeVariants } from "@/features/mindmap/components/EdgeLayer";
import TempNode, { TEMP_NODE_SIZE } from "@/features/mindmap/node/components/temp_node/TempNode";
import { NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { getContentBounds } from "@/features/mindmap/utils/node_geometry";
import { getBezierPath } from "@/features/mindmap/utils/path";

type DropIndicatorProps = {
    targetId: NodeId;
    direction: NodeDirection;
    nodeMap: Map<NodeId, NodeElement>;
};

const GHOST_GAP_X = 100;
const SIBLING_GAP_Y = 16;

export default function DropIndicator({ targetId, direction, nodeMap }: DropIndicatorProps) {
    const targetNode = nodeMap.get(targetId);
    if (!targetNode || !direction) return null;

    const targetWidth = targetNode.width || 200;
    const targetHeight = targetNode.height || 60;

    const ghostWidth = TEMP_NODE_SIZE.ghost.width;
    const ghostHeight = TEMP_NODE_SIZE.ghost.height;

    let ghostX = targetNode.x;
    let ghostY = targetNode.y;

    /**
     * 엣지 출발은 "부모"
     * - child: 부모 = targetNode
     * - prev/next: 부모 = targetNode.parent
     */
    const parentNode =
        direction === "child" ? targetNode : targetNode.parentId ? nodeMap.get(targetNode.parentId) : undefined;

    // 브랜치 방향(좌/우)은 target의 addNodeDirection 기준이 안전(루트 자식도 포함)
    const branchSide = targetNode.type === "root" ? "right" : targetNode.addNodeDirection;

    switch (direction) {
        case "child": {
            // NOTE: root 위 드롭 시 좌/우는 현재 로직상 무조건 right.
            // 요구사항대로면 InteractionManager가 mouseX로 left/right 결정해서 내려줘야 함.
            const side = targetNode.type === "root" ? "right" : targetNode.addNodeDirection;

            ghostX =
                side === "right"
                    ? targetNode.x + targetWidth / 2 + GHOST_GAP_X + ghostWidth / 2
                    : targetNode.x - targetWidth / 2 - GHOST_GAP_X - ghostWidth / 2;

            ghostY = targetNode.y;
            break;
        }

        case "prev": {
            /**
             * "형제 사이 중앙" 계산
             * prev면: prevSibling.bottom ~ target.top 사이 중앙에 ghost center 배치
             */
            const prevSibling = targetNode.prevId ? nodeMap.get(targetNode.prevId) : undefined;

            if (prevSibling) {
                const prevH = prevSibling.height || 60;
                const prevBottom = prevSibling.y + prevH / 2;

                const targetTop = targetNode.y - targetHeight / 2;

                ghostY = (prevBottom + targetTop) / 2;
            } else {
                // 첫 번째 자식의 prev: 위로 yGap만큼 띄우는 규칙
                ghostY = targetNode.y - targetHeight / 2 - SIBLING_GAP_Y - ghostHeight / 2;
            }
            break;
        }

        case "next": {
            /**
             * next면: target.bottom ~ nextSibling.top 사이 중앙
             */
            const nextSibling = targetNode.nextId ? nodeMap.get(targetNode.nextId) : undefined;

            if (nextSibling) {
                const nextH = nextSibling.height || 60;
                const nextTop = nextSibling.y - nextH / 2;

                const targetBottom = targetNode.y + targetHeight / 2;

                ghostY = (targetBottom + nextTop) / 2;
            } else {
                // 마지막 자식의 next
                ghostY = targetNode.y + targetHeight / 2 + SIBLING_GAP_Y + ghostHeight / 2;
            }
            break;
        }
    }

    /**
     * ghost edge도 content wall 기준으로
     * - start: parent.content wall
     * - end: ghost box에서 parent를 향하는 벽
     */
    if (!parentNode) return null;

    const parentBounds = getContentBounds(parentNode);
    const isRightBranch = branchSide === "right";

    const startX = isRightBranch ? parentBounds.right : parentBounds.left;
    const startY = parentNode.y;

    // ghost의 "부모 방향" 벽
    const endX = isRightBranch ? ghostX - ghostWidth / 2 : ghostX + ghostWidth / 2;
    const endY = ghostY;

    const pathData = getBezierPath(startX, startY, endX, endY);

    return (
        <g className="drop-indicator pointer-events-none">
            <path d={pathData} className={edgeVariants({ type: "ghost" })} />

            <g transform={`translate(${ghostX}, ${ghostY})`}>
                <foreignObject width={ghostWidth} height={ghostHeight} x={-ghostWidth / 2} y={-ghostHeight / 2}>
                    <TempNode type="ghost" />
                </foreignObject>
            </g>
        </g>
    );
}
