import EdgeLayer from "@/features/mindmap/components/EdgeLayer";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

type StaticLayerProps = {
    nodeMap: Map<NodeId, NodeElement>;
    isDragging: boolean;
};

export default function StaticLayer({ nodeMap, isDragging }: StaticLayerProps) {
    const allNodes = Array.from(nodeMap.values());

    return (
        <g className={`static-layer ${isDragging ? "is-dragging" : ""}`}>
            <EdgeLayer nodeMap={nodeMap} filterNode={allNodes} color="violet" />
            {allNodes.map((node) => (
                <NodeItem key={node.id} nodeId={node.id} />
            ))}
        </g>
    );
}
