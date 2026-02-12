import { useMemo } from "react";

import EdgeLayer from "@/features/mindmap/components/EdgeLayer";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

type MovingNodeFragmentProps = {
    subtreeIds: Set<NodeId>;
    nodeMap: Map<NodeId, NodeElement>;
    delta: { x: number; y: number }; //이동량
};

/** 마우스로 잡고 노드를 움직일때 마우스에 따라다니는 덩어리 노드들 */
export default function MovingNodeFragment({ subtreeIds, nodeMap, delta }: MovingNodeFragmentProps) {
    // 전체 nodeMap 중 movingHead ~ 자식 노드를 하나의 덩어리화, 맵 내용이 변경될때만 fragment 다시 그림
    const fragmentMap = useMemo(() => {
        const map = new Map<NodeId, NodeElement>();
        subtreeIds.forEach((id) => {
            const node = nodeMap.get(id);
            if (node) map.set(id, node);
        });
        return map;
    }, [subtreeIds, nodeMap]);

    subtreeIds.forEach((id) => {
        const node = nodeMap.get(id);
        if (node) fragmentMap.set(id, node);
    });

    return (
        <g transform={`translate(${delta.x}, ${delta.y})`} className="moving-fragment-group">
            <EdgeLayer nodeMap={fragmentMap} type="active" />

            {Array.from(subtreeIds).map((id) => (
                <NodeItem key={`moving-${id}`} nodeId={id} />
            ))}
        </g>
    );
}
