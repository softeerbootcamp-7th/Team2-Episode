import { useEffect } from "react";

import DragGhostStyle from "@/features/mindmap/components/DragGhostStyle";
import InteractionLayer from "@/features/mindmap/components/InteractionLayer";
import StaticLayer from "@/features/mindmap/components/StaticLayer";
import {
    useMindMapCore,
    useMindMapInteractionFrame,
    useMindMapVersion,
} from "@/features/mindmap/hooks/useMindmapContext";
import { useViewportEvents } from "@/features/mindmap/hooks/useViewportEvents";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

/**
 * interaction 프레임은 이 컴포넌트만 구독해서, movingFragment만 리렌더되도록 분리
 */
function InteractionOverlay({ nodeMap }: { nodeMap: Map<NodeId, NodeElement> }) {
    const status = useMindMapInteractionFrame();

    // mode가 바뀔 때만 DOM의 속성을 변경 (리렌더링 유발 X)
    useEffect(() => {
        const root = document.querySelector(".mindmap-render-root") as HTMLElement;
        if (root) {
            root.setAttribute("data-dragging", status.mode === "dragging" ? "true" : "false");
        }
    }, [status.mode]);

    return <InteractionLayer status={status} nodeMap={nodeMap} />;
}

function MindMapInnerRenderer() {
    const mindmap = useMindMapCore();
    const version = useMindMapVersion();

    if (!mindmap) return null;
    useViewportEvents();

    const nodeMap = mindmap.tree.nodes;

    return (
        <g className="mindmap-render-root" data-version={version}>
            <StaticLayer nodeMap={nodeMap} />
            <DragGhostStyle />
            <InteractionOverlay nodeMap={nodeMap} />
        </g>
    );
}

export default function MindMapRenderer() {
    const mindmap = useMindMapCore();

    if (!mindmap || !mindmap.getIsReady()) return null;
    return <MindMapInnerRenderer />;
}
