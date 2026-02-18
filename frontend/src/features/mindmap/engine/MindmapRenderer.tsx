import { useRef } from "react";

import TreeLayer from "@/features/mindmap/components/StaticLayer";
import { useMindmapEngineContext, useMindmapReady } from "@/features/mindmap/engine/hooks";
import InteractionLayout from "@/features/mindmap/engine/InteractionLayout";
import CollaborationCursorsLayer from "@/features/mindmap/engine/RemoteCursorLayer";

export default function MindmapRenderer() {
    const engine = useMindmapEngineContext();
    const ready = useMindmapReady();
    const rootRef = useRef<SVGGElement>(null);

    if (!ready) return null;

    const nodeMap = engine.getState().graph.nodes;

    return (
        <g ref={rootRef} className="mindmap-render-root" data-dragging="false">
            <TreeLayer nodeMap={nodeMap} />
            <InteractionLayout nodeMap={nodeMap} rootRef={rootRef} />
            <CollaborationCursorsLayer />
        </g>
    );
}
