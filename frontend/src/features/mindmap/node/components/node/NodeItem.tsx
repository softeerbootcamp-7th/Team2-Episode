import { useMindMapActions } from "@/features/mindmap/hooks/useMindmapContext";
import { useMindMapNode } from "@/features/mindmap/hooks/useMindmapNode";
import { Node } from "@/features/mindmap/node/components/node/Node";
import { NodeId } from "@/features/mindmap/types/node";

export default function NodeItem({ nodeId }: { nodeId: NodeId }) {
    const nodeData = useMindMapNode(nodeId);
    // TODO: 나머지 action도 추가
    const { addNode } = useMindMapActions();

    if (!nodeData) {
        return null;
    }

    // TODO: title, color,size,direction,,,, 지금은 하드코딩으로 넣음
    const { x, y, width, height } = nodeData;

    return (
        <foreignObject x={x - width / 2} y={y - height / 2} width={width} height={height} className="overflow-hidden">
            <Node>
                <Node.AddNode direction={"left"} color={"blue"} onClick={() => addNode(nodeId, "child")} />
                <Node.Content size={"sm"} color={"blue"} onClick={() => console.log(`클릭!`)}>
                    {"title~~"}
                </Node.Content>
            </Node>
        </foreignObject>
    );
}
