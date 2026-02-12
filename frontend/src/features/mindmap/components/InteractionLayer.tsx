import DropIndicator from "@/features/mindmap/components/DropIndicator";
import MovingNodeFragment from "@/features/mindmap/components/MovingNodeFragment";
import { BaseNodeInfo, InteractionMode } from "@/features/mindmap/types/interaction";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

type InteractionStatus = {
    mode: InteractionMode;
    draggingNodeId: NodeId | null;
    dragDelta: { x: number; y: number };
    dragSubtreeIds: Set<NodeId> | null;
    baseNode: BaseNodeInfo;
};

type InteractionLayerProps = {
    status: InteractionStatus;
    nodeMap: Map<NodeId, NodeElement>; //전체 맵 (DropIndicator가 targetNode를 탐색하도록)
};

export default function InteractionLayer({ status, nodeMap }: InteractionLayerProps) {
    const { mode, draggingNodeId, dragDelta, dragSubtreeIds, baseNode } = status;

    // 드래그 모드가 아니면 아무것도 안 보여줌
    if (mode !== "dragging" || !draggingNodeId || !dragSubtreeIds) return null;

    return (
        <g className="interaction-layer">
            {/* 덩어리는 드래그 중이라면 '항상' 마우스를 따라다님 */}
            <MovingNodeFragment filterIds={dragSubtreeIds} nodeMap={nodeMap} delta={dragDelta} />

            {/* 타겟이 있을 때만 가이드 띄움 */}
            {baseNode.targetId && baseNode.direction && (
                <DropIndicator targetId={baseNode.targetId} direction={baseNode.direction} nodeMap={nodeMap} />
            )}
        </g>
    );
}
