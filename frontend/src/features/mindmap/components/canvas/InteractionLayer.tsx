import DropIndicator from "@/features/mindmap/components/canvas/DropIndicator";
import MovingNodeFragment from "@/features/mindmap/components/canvas/MovingNodeFragment";
import { InteractionSnapshot } from "@/features/mindmap/types/interaction";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

type InteractionLayerProps = {
    nodeMap: Map<NodeId, NodeElement>;
    status: InteractionSnapshot;
};
export default function InteractionLayer({ nodeMap, status }: InteractionLayerProps) {
    const { mode, draggingNodeId, dragDelta, dragSubtreeIds, baseNode } = status;

    if (mode !== "dragging" || !draggingNodeId || !dragSubtreeIds) return null;

    return (
        <g className="interaction-layer">
            {baseNode.targetId && baseNode.direction && (
                <DropIndicator targetId={baseNode.targetId} direction={baseNode.direction} nodeMap={nodeMap} />
            )}

            <MovingNodeFragment filterIds={dragSubtreeIds} nodeMap={nodeMap} delta={dragDelta} />
        </g>
    );
}
