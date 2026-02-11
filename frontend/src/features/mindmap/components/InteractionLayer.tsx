import { edgeVariants } from "@/features/mindmap/components/EdgeLayer";
import TempNode, { TEMP_NODE_SIZE } from "@/features/mindmap/node/components/temp_node/TempNode";
import { BaseNodeInfo, InteractionMode } from "@/features/mindmap/types/interaction";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";
import { getBezierPath } from "@/features/mindmap/utils/path";
import { cn } from "@/utils/cn";

type InteractionStatus = {
    mode: InteractionMode;
    draggingNodeId: NodeId | null;
    dragDelta: { x: number; y: number };
    dragSubtreeIds: Set<NodeId> | null;
    baseNode: BaseNodeInfo;
};

type InteractionLayerProps = {
    status: InteractionStatus;
    nodeMap: Map<NodeId, NodeElement>;
};

export default function InteractionLayer({ status, nodeMap }: InteractionLayerProps) {
    const { mode, draggingNodeId, dragDelta, baseNode } = status;

    // 드래그 중이거나 생성 중일 때만 동작 (여기서는 드래그 중심)
    if (mode !== "dragging" || !draggingNodeId) return null;

    const movingNode = nodeMap.get(draggingNodeId);
    const targetNode = baseNode.targetId ? nodeMap.get(baseNode.targetId) : null;

    if (!movingNode) return null;

    // 실시간 좌표계 계산
    const currentX = movingNode.x + dragDelta.x;
    const currentY = movingNode.y + dragDelta.y;

    return (
        <g className="interaction-layer">
            {targetNode && (
                <path
                    d={getBezierPath(
                        targetNode.x + targetNode.width / 2,
                        targetNode.y,
                        currentX - TEMP_NODE_SIZE.ghost.width / 2,
                        currentY,
                    )}
                    className={cn(
                        edgeVariants({
                            type: "ghost",
                        }),
                    )}
                />
            )}

            {/** ghost 노드 */}
            <g transform={`translate(${currentX}, ${currentY})`}>
                <foreignObject
                    width={TEMP_NODE_SIZE.ghost.width}
                    height={TEMP_NODE_SIZE.ghost.height}
                    x={-TEMP_NODE_SIZE.ghost.width / 2}
                    y={-TEMP_NODE_SIZE.ghost.height / 2}
                >
                    <TempNode />
                </foreignObject>
            </g>
        </g>
    );
}
