import React, { useLayoutEffect, useMemo, useRef } from "react";

import EdgeLayer from "@/features/mindmap/engine/EdgeLayer";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

type MovingNodeFragmentProps = {
    nodeMap: Map<NodeId, NodeElement>;
    filterIds: Set<NodeId>;
    delta: { x: number; y: number };
};

const MovingTree = React.memo(
    function MovingTree({ filterIds, nodeMap }: { filterIds: Set<NodeId>; nodeMap: Map<NodeId, NodeElement> }) {
        const { fragmentNodes, fragmentMap } = useMemo(() => {
            const map = new Map<NodeId, NodeElement>();

            filterIds.forEach((id) => {
                const node = nodeMap.get(id);
                if (node) {
                    map.set(id, node);
                }
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

MovingTree.displayName = "MovingTree";

export default function MovingTreeLayer({ filterIds, nodeMap, delta }: MovingNodeFragmentProps) {
    const groupRef = useRef<SVGGElement | null>(null);

    useLayoutEffect(() => {
        if (!groupRef.current) return;
        groupRef.current.setAttribute("transform", `translate(${delta.x}, ${delta.y})`);
    }, [delta.x, delta.y]);

    return (
        <g ref={groupRef} className="moving-fragment-group">
            <MovingTree filterIds={filterIds} nodeMap={nodeMap} />
        </g>
    );
}
