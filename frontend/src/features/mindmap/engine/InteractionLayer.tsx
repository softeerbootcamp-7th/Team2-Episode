import { useEffect } from "react";

import DropIndicator from "@/features/mindmap/components/DropIndicator";
import MovingNodeFragment from "@/features/mindmap/components/MovingNodeFragment";
import { useMindmapInteraction } from "@/features/mindmap/engine/hooks";
import { useMindmapControllerEvents } from "@/features/mindmap/engine/useMindmapEngineEvents";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

/**
 * Interaction 전용 오버레이
 * - interaction 채널만 구독
 * - static graph는 리렌더하지 않음
 */
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
                <DropIndicator
                    targetId={baseNode.targetId}
                    direction={baseNode.direction}
                    nodeMap={nodeMap}
                    side={baseNode.side ?? null}
                />
            )}

            <MovingNodeFragment filterIds={dragSubtreeIds} nodeMap={nodeMap} delta={dragDelta} />
        </g>
    );
}
