import { useEffect, useRef } from "react";

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
function InteractionOverlay({
    nodeMap,
    rootRef,
}: {
    nodeMap: Map<NodeId, NodeElement>;
    rootRef: React.RefObject<SVGGElement | null>;
}) {
    const status = useMindMapInteractionFrame();

    // 부모로부터 받은 ref를 사용하여 해당 인스턴스의 DOM만 조작
    useEffect(() => {
        const root = rootRef.current;
        if (root) {
            root.setAttribute("data-dragging", status.mode === "dragging" ? "true" : "false");
        }
    }, [status.mode, rootRef]);

    return <InteractionLayer status={status} nodeMap={nodeMap} />;
}

function MindMapInnerRenderer() {
    const mindmap = useMindMapCore();
    const version = useMindMapVersion();
    const rootRef = useRef<SVGGElement>(null);

    if (!mindmap) return null;
    useViewportEvents();

    const nodeMap = mindmap.tree.nodes;

    return (
        <g ref={rootRef} className="mindmap-render-root" data-version={version} data-dragging="false">
            <StaticLayer nodeMap={nodeMap} />
            <DragGhostStyle />
            <InteractionOverlay nodeMap={nodeMap} rootRef={rootRef} />
        </g>
    );
}

export default function MindMapRenderer() {
    const mindmap = useMindMapCore();

    if (!mindmap || !mindmap.getIsReady()) return null;
    return <MindMapInnerRenderer />;
}
