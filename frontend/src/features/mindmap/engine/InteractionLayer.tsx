import { useEffect } from "react";

import DropNodePreviewLayer from "@/features/mindmap/engine/DropNodePreviewLayer";
import MovingTreeLayer from "@/features/mindmap/engine/MovingTreeLayer";
import { useMindmapControllerEvents } from "@/features/mindmap/engine/useMindmapEngineEvents";
import { useMindmapInteraction } from "@/features/mindmap/hooks/useMindmapStoreState";
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
        root.setAttribute("data-dragging", status.mode === "dragging" ? "true" : "false");
    }, [status.mode, rootRef]);

    const { mode, draggingNodeId, dragDelta, dragSubtreeIds, baseNode } = status;

    if (mode !== "dragging" || !draggingNodeId || !dragSubtreeIds) return null;

    return (
        <g className="interaction-layer">
            {baseNode.targetId && baseNode.direction && (
                <DropNodePreviewLayer
                    targetId={baseNode.targetId}
                    direction={baseNode.direction}
                    nodeMap={nodeMap}
                    side={baseNode.side ?? null}
                />
            )}

            <MovingTreeLayer filterIds={dragSubtreeIds} nodeMap={nodeMap} delta={dragDelta} />
        </g>
    );
}
