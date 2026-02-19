import { useRef } from "react";

import CollaborationCursorsLayer from "@/features/mindmap/core/CollaborationCursorsLayer";
import InteractionLayer from "@/features/mindmap/core/InteractionLayer";
import { useMindmapControllerContext } from "@/features/mindmap/core/MindmapProvider";
import TreeLayer from "@/features/mindmap/core/TreeLayer";
import { useMindmapReady } from "@/features/mindmap/hooks/useMindmapStoreState";
import { useMindmapGraphRevision } from "@/features/mindmap/hooks/useMindmapStoreState";

export default function MindmapRenderer() {
    const engine = useMindmapControllerContext();
    const ready = useMindmapReady();
    useMindmapGraphRevision();
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
