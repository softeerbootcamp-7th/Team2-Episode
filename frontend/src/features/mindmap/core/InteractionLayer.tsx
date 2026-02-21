import { useEffect } from "react";

import DropNodePreviewLayer from "@/features/mindmap/core/DropNodePreviewLayer";
import MovingTreeLayer from "@/features/mindmap/core/MovingTreeLayer";
import { useMindmapControllerEvents } from "@/features/mindmap/hooks/useMindmapEngineEvents";
import { useMindmapInteraction } from "@/features/mindmap/hooks/useMindmapStoreState";
import TempNode, { TEMP_NODE_SIZE } from "@/features/mindmap/node/components/temp_node/TempNode";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

export default function InteractionLayer({
    nodeMap,
    rootRef,
}: {
    nodeMap: Map<NodeId, NodeElement>;
    rootRef: React.RefObject<SVGGElement | null>;
}) {
    const status = useMindmapInteraction();
    useMindmapControllerEvents();

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const isInteracting = ["dragging", "pending_creation"].includes(status.mode);
        root.setAttribute("data-dragging", isInteracting ? "true" : "false");
    }, [status.mode, rootRef]);

    const { mode, draggingNodeId, dragDelta, dragSubtreeIds, baseNode, mousePos } = status;

    if (mode !== "dragging" && mode !== "pending_creation") return null;

    return (
        <g className="interaction-layer">
            {baseNode.targetId && baseNode.direction && (
                <DropNodePreviewLayer
                    targetId={baseNode.targetId}
                    direction={baseNode.direction}
                    nodeMap={nodeMap}
                    side={baseNode.side}
                />
            )}

            {mode === "dragging" && draggingNodeId && dragSubtreeIds && (
                <MovingTreeLayer filterIds={dragSubtreeIds} nodeMap={nodeMap} delta={dragDelta} />
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
