import { useMemo } from "react";

import EdgeLayer from "@/features/mindmap/components/EdgeLayer";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

/**
 * nodeMap: 전체 맵
 * filterIds : 마우스에 붙어 움직일 노드 Ids
 * delta : 이동량
 */
type MovingNodeFragmentProps = {
    nodeMap: Map<NodeId, NodeElement>;
    filterIds: Set<NodeId>; //
    delta: { x: number; y: number };
};

/** 마우스로 잡고 노드를 움직일때 마우스에 따라다니는 덩어리 노드들 */
export default function MovingNodeFragment({ filterIds, nodeMap, delta }: MovingNodeFragmentProps) {
    // 전체 nodeMap 중 movingHead ~ 자식 노드를 하나의 덩어리화, 맵 내용이 변경될때만 fragment 다시 그림
    const { fragmentNodes, fragmentMap } = useMemo(() => {
        const nodes: NodeElement[] = [];
        const map = new Map<NodeId, NodeElement>();

        filterIds.forEach((id) => {
            const node = nodeMap.get(id);
            if (node) {
                nodes.push(node);
                map.set(id, node);
            }
        });

        return { fragmentNodes: nodes, fragmentMap: map };
    }, [filterIds, nodeMap]);

    return (
        <g transform={`translate(${delta.x}, ${delta.y})`} className="moving-fragment-group">
            <EdgeLayer nodeMap={fragmentMap} type="active" filterNode={fragmentNodes} />

            {Array.from(filterIds).map((id) => (
                <NodeItem key={`moving-${id}`} nodeId={id} />
            ))}
        </g>
    );
}
