import { edgeVariants } from "@/features/mindmap/engine/EdgeLayer";
import TempNode, { TEMP_NODE_SIZE } from "@/features/mindmap/node/components/temp_node/TempNode";
import { AddNodeDirection, NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { getContentBounds } from "@/features/mindmap/utils/node_geometry";
import { getBezierPath } from "@/features/mindmap/utils/path";

type DropIndicatorProps = {
    targetId: NodeId;
    direction: NodeDirection;
    nodeMap: Map<NodeId, NodeElement>;
    side?: AddNodeDirection | null;
};

const GHOST_GAP_X = 100;
const SIBLING_GAP_Y = 16;
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 60;

export default function DropNodePreviewLayer({ targetId, direction, nodeMap, side }: DropIndicatorProps) {
    const targetNode = nodeMap.get(targetId);
    if (!targetNode || !direction) return null;

    const targetWidth = targetNode.width || DEFAULT_NODE_WIDTH;
    const targetHeight = targetNode.height || DEFAULT_NODE_HEIGHT;

    const ghostWidth = TEMP_NODE_SIZE.ghost.width;
    const ghostHeight = TEMP_NODE_SIZE.ghost.height;

    let ghostX = targetNode.x;
    let ghostY = targetNode.y;

    const parentNode =
        direction === "child" ? targetNode : targetNode.parentId ? nodeMap.get(targetNode.parentId) : undefined;

    const branchSide: AddNodeDirection =
        direction === "child" && targetNode.type === "root"
            ? (side ?? "right")
            : targetNode.type === "root"
              ? "right"
              : targetNode.addNodeDirection;

    switch (direction) {
        case "child": {
            const resolvedSide: AddNodeDirection =
                targetNode.type === "root" ? (side ?? "right") : targetNode.addNodeDirection;

            ghostX =
                resolvedSide === "right"
                    ? targetNode.x + targetWidth / 2 + GHOST_GAP_X + ghostWidth / 2
                    : targetNode.x - targetWidth / 2 - GHOST_GAP_X - ghostWidth / 2;

            ghostY = targetNode.y;
            break;
        }

        case "prev": {
            const prevSibling = targetNode.prevId ? nodeMap.get(targetNode.prevId) : undefined;

            if (prevSibling) {
                const prevH = prevSibling.height || 60;
                const prevBottom = prevSibling.y + prevH / 2;

                const targetTop = targetNode.y - targetHeight / 2;

                ghostY = (prevBottom + targetTop) / 2;
            } else {
                ghostY = targetNode.y - targetHeight / 2 - SIBLING_GAP_Y - ghostHeight / 2;
            }
            break;
        }

        case "next": {
            const nextSibling = targetNode.nextId ? nodeMap.get(targetNode.nextId) : undefined;

            if (nextSibling) {
                const nextH = nextSibling.height || 60;
                const nextTop = nextSibling.y - nextH / 2;

                const targetBottom = targetNode.y + targetHeight / 2;

                ghostY = (targetBottom + nextTop) / 2;
            } else {
                ghostY = targetNode.y + targetHeight / 2 + SIBLING_GAP_Y + ghostHeight / 2;
            }
            break;
        }
    }

    if (!parentNode) return null;

    const parentBounds = getContentBounds(parentNode);
    const isRightBranch = branchSide === "right";

    const startX = isRightBranch ? parentBounds.right : parentBounds.left;
    const startY = parentNode.y;

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
