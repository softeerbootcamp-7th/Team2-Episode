import EdgeLayer from "@/features/mindmap/engine/EdgeLayer";
import { useMindmapGraphRevision } from "@/features/mindmap/engine/hooks";
import { useHideDraggingNodes } from "@/features/mindmap/engine/useHideDraggingNodes";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";

type Props = {
    nodeMap: Map<NodeId, NodeElement>;
};

export default function TreeLayer({ nodeMap }: Props) {
    useMindmapGraphRevision();
    useHideDraggingNodes();

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
