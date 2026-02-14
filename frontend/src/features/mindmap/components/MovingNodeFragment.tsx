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
        const map = new Map<NodeId, NodeElement>();

        // 드래그 중인 노드들만 맵에 담기
        filterIds.forEach((id) => {
            const node = nodeMap.get(id);
            if (node) {
                map.set(id, node);
            }
        });

        // 엣지가 그릴 대상을 '부모가 같은 드래그 그룹 안에 있는 경우'로 제한
        const nodesForEdge = Array.from(map.values()).filter((node) => map.has(node.parentId));

        return { fragmentNodes: nodesForEdge, fragmentMap: map };
    }, [filterIds, nodeMap]);

    return (
        <g transform={`translate(${delta.x}, ${delta.y})`} className="moving-fragment-group">
            <EdgeLayer nodeMap={fragmentMap} type="active" filterNode={fragmentNodes} color="violet" />

            {Array.from(filterIds).map((id) => (
                <NodeItem key={`moving-${id}`} nodeId={id} />
            ))}
        </g>
    );
}
