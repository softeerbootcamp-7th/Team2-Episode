import React, { useLayoutEffect, useMemo, useRef } from "react";

import EdgeLayer from "@/features/mindmap/components/EdgeLayer";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

type MovingNodeFragmentProps = {
    nodeMap: Map<NodeId, NodeElement>;
    filterIds: Set<NodeId>;
    delta: { x: number; y: number };
};

/**
 * ✅ delta 변화(매 프레임)에는 NodeItem 트리가 리렌더되지 않도록 분리
 * - g의 transform만 imperative하게 업데이트
 * - NodeItem/Edge는 memoized content로 고정
 */

const MovingContent = React.memo(
    function MovingContent({ filterIds, nodeMap }: { filterIds: Set<NodeId>; nodeMap: Map<NodeId, NodeElement> }) {
        const { fragmentNodes, fragmentMap } = useMemo(() => {
            const map = new Map<NodeId, NodeElement>();

            filterIds.forEach((id) => {
                const node = nodeMap.get(id);
                if (node) map.set(id, node);
            });

            const nodesForEdge = Array.from(map.values()).filter((node) => map.has(node.parentId));
            return { fragmentNodes: nodesForEdge, fragmentMap: map };
        }, [filterIds, nodeMap]);

        return (
            <>
                <EdgeLayer nodeMap={fragmentMap} type="active" filterNode={fragmentNodes} color="violet" />
                {Array.from(filterIds).map((id) => (
                    <NodeItem key={`moving-${id}`} nodeId={id} measure={false} />
                ))}
            </>
        );
    },
    (prev, next) => prev.filterIds === next.filterIds && prev.nodeMap === next.nodeMap,
);

MovingContent.displayName = "MovingContent";

export default function MovingNodeFragment({ filterIds, nodeMap, delta }: MovingNodeFragmentProps) {
    const groupRef = useRef<SVGGElement | null>(null);

    // ✅ 매 프레임 DOM attribute만 갱신(React tree는 그대로)
    useLayoutEffect(() => {
        if (!groupRef.current) return;
        groupRef.current.setAttribute("transform", `translate(${delta.x}, ${delta.y})`);
    }, [delta.x, delta.y]);

    return (
        <g ref={groupRef} className="moving-fragment-group">
            <MovingContent filterIds={filterIds} nodeMap={nodeMap} />
        </g>
    );
}
