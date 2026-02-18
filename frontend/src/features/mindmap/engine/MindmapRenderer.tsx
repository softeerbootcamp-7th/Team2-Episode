import { useRef } from "react";

import CollaborationCursorsLayer from "@/features/mindmap/engine/CollaborationCursorsLayer";
import { useMindmapEngineContext, useMindmapReady } from "@/features/mindmap/engine/hooks";
import InteractionLayer from "@/features/mindmap/engine/InteractionLayer";
import TreeLayer from "@/features/mindmap/engine/TreeLayer";

export default function MindmapRenderer() {
    const engine = useMindmapEngineContext();
    const ready = useMindmapReady();
    const rootRef = useRef<SVGGElement>(null);

    if (!ready) return null;

    const nodeMap = engine.getState().graph.nodes;

    return (
        <g ref={rootRef} className="mindmap-render-root" data-dragging="false">
            <TreeLayer nodeMap={nodeMap} />
            <InteractionLayer nodeMap={nodeMap} rootRef={rootRef} />
            <CollaborationCursorsLayer />
        </g>
    );
}
