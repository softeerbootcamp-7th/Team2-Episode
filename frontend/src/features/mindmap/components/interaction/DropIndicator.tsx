import { edgeVariants } from "@/features/mindmap/components/EdgeLayer";
import TempNode, { TEMP_NODE_SIZE } from "@/features/mindmap/node/components/temp_node/TempNode";
import { NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { getBezierPath } from "@/features/mindmap/utils/path";

type DropIndicatorProps = {
    targetId: NodeId;
    direction: NodeDirection;
    nodeMap: Map<NodeId, NodeElement>;
};

// TODO: 임시
const GHOST_GAP_X = 60;
const GHOST_GAP_Y = 20;

/** 마우스를 놓을 때 자석처럼 붙을 ghost node */
export default function DropIndicator({ targetId, direction, nodeMap }: DropIndicatorProps) {
    const targetNode = nodeMap.get(targetId);
    if (!targetNode || !direction) return null;

    // 고스트 노드가 나타날 위치
    let ghostX = targetNode.x;
    let ghostY = targetNode.y;

    switch (direction) {
        case "child":
            ghostX = targetNode.x + targetNode.width / 2 + GHOST_GAP_X + TEMP_NODE_SIZE.ghost.width / 2;
            ghostY = targetNode.y;
            break;
        case "prev":
            ghostX = targetNode.x;
            ghostY = targetNode.y - targetNode.height / 2 - GHOST_GAP_Y - TEMP_NODE_SIZE.ghost.height / 2;
            break;
        case "next":
            ghostX = targetNode.x;
            ghostY = targetNode.y + targetNode.height / 2 + GHOST_GAP_Y + TEMP_NODE_SIZE.ghost.height / 2;
    }

    const pathData = getBezierPath(
        targetNode.x + targetNode.width / 2,
        targetNode.y,
        ghostX - TEMP_NODE_SIZE.ghost.width / 2,
        ghostY,
    );

    return (
        <g className="drop-indicator pointer-events-none">
            <path d={pathData} className={edgeVariants({ type: "ghost" })} />

            <g transform={`translate(${ghostX}, ${ghostY})`}>
                <foreignObject
                    width={TEMP_NODE_SIZE.ghost.width}
                    height={TEMP_NODE_SIZE.ghost.height}
                    x={-TEMP_NODE_SIZE.ghost.width / 2}
                    y={-TEMP_NODE_SIZE.ghost.height / 2}
                    className="overflow-visible"
                >
                    <TempNode type="ghost" />
                </foreignObject>
            </g>
        </g>
    );
}
