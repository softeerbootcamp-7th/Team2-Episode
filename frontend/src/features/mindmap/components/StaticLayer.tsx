import EdgeLayer from "@/features/mindmap/components/EdgeLayer";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

export default function StaticLayer({ nodeMap }: { nodeMap: Map<NodeId, NodeElement> }) {
    const allNodes = Array.from(nodeMap.values());

    return (
        <g className="static-graph">
            <EdgeLayer nodeMap={nodeMap} filterNode={allNodes} color="violet" />
            {allNodes.map((node) => (
                <NodeItem key={node.id} nodeId={node.id} />
            ))}
        </g>
    );
}
