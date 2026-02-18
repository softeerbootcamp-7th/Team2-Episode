import { useEffect, useRef } from "react";

import DragGhostStyle from "@/features/mindmap/components/DragGhostStyle";
import InteractionLayer from "@/features/mindmap/components/InteractionLayer";
import StaticLayer from "@/features/mindmap/components/StaticLayer";
import { useMindmapEngineContext, useMindmapInteraction, useMindmapReady } from "@/features/mindmap/engine/hooks";
import ParticipantsBar from "@/features/mindmap/engine/ParticipantsBar";
import RemoteCursorLayer from "@/features/mindmap/engine/RemoteCursorLayer";
import { useMindmapEngineEvents } from "@/features/mindmap/engine/useMindmapEngineEvents";
import type { NodeElement, NodeId } from "@/features/mindmap/types/node";

/**
 * Interaction 전용 오버레이
 * - interaction 채널만 구독
 * - static graph는 리렌더하지 않음
 */
function InteractionOverlay({
    nodeMap,
    rootRef,
}: {
    nodeMap: Map<NodeId, NodeElement>;
    rootRef: React.RefObject<SVGGElement | null>;
}) {
    const status = useMindmapInteraction();

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        root.setAttribute("data-dragging", status.mode === "dragging" ? "true" : "false");
    }, [status.mode, rootRef]);

    return <InteractionLayer status={status} nodeMap={nodeMap} />;
}

function MindMapInnerRenderer() {
    const engine = useMindmapEngineContext();
    const rootRef = useRef<SVGGElement>(null);

    // 🔥 이벤트 바인딩
    useMindmapEngineEvents();

    const nodeMap = engine.getState().graph.nodes;

    return (
        <g ref={rootRef} className="mindmap-render-root" data-dragging="false">
            <StaticLayer nodeMap={nodeMap} />
            <DragGhostStyle />
            <InteractionOverlay nodeMap={nodeMap} rootRef={rootRef} />
            <RemoteCursorLayer />
            <ParticipantsBar />
        </g>
    );
}

export default function MindMapRenderer() {
    const ready = useMindmapReady();
    if (!ready) return null;
    return <MindMapInnerRenderer />;
}
