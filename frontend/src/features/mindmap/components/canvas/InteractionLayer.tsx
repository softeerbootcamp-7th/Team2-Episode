import DropIndicator from "@/features/mindmap/components/canvas/DropIndicator";
import MovingNodeFragment from "@/features/mindmap/components/canvas/MovingNodeFragment";
import TempNode, { TEMP_NODE_SIZE } from "@/features/mindmap/node/components/temp_node/TempNode";
import { InteractionSnapshot } from "@/features/mindmap/types/interaction";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

type InteractionLayerProps = {
    nodeMap: Map<NodeId, NodeElement>;
    status: InteractionSnapshot;
};
export default function InteractionLayer({ nodeMap, status }: InteractionLayerProps) {
    const { mode, draggingNodeId, dragDelta, dragSubtreeIds, baseNode, mousePos } = status;

    if (mode === "idle") return null;

    return (
        <g className="interaction-layer">
            {baseNode.targetId && baseNode.direction && (
                <DropIndicator targetId={baseNode.targetId} direction={baseNode.direction} nodeMap={nodeMap} />
            )}

            {mode === "dragging" && draggingNodeId && dragSubtreeIds && (
                <MovingNodeFragment filterIds={dragSubtreeIds} nodeMap={nodeMap} delta={dragDelta} />
            )}

            {mode === "pending_creation" && (
                <g
                    transform={`translate(${mousePos.x}, ${mousePos.y})`}
                    style={{ pointerEvents: "none" }} // 마우스 이벤트 방해 금지
                >
                    <foreignObject
                        x={-90}
                        y={-40}
                        width={TEMP_NODE_SIZE.new.width}
                        height={TEMP_NODE_SIZE.new.height}
                        className="overflow-visible"
                    >
                        <TempNode type="new" />
                    </foreignObject>
                </g>
            )}
        </g>
    );
}
