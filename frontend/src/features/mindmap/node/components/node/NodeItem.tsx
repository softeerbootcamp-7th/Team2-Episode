import { useEffect, useRef } from "react";

import { useMindMapActions } from "@/features/mindmap/hooks/useMindmapContext";
import { useMindMapNode } from "@/features/mindmap/hooks/useMindmapNode";
import { Node } from "@/features/mindmap/node/components/node/Node";
import NodeCenter from "@/features/mindmap/node/components/node_center/NodeCenter";
import { NodeId } from "@/features/mindmap/types/node";

export default function NodeItem({ nodeId }: { nodeId: NodeId }) {
    const nodeData = useMindMapNode(nodeId);
    const { updateNodeSize, addNode } = useMindMapActions();

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            // 브라우저가 계산한 실제 너비와 높이를 가져옵니다.
            const { width, height } = contentRef.current.getBoundingClientRect();

            if (Math.abs(nodeData!.width - width) > 0.5 || Math.abs(nodeData!.height - height) > 0.5) {
                updateNodeSize(nodeId, width, height);
            }
        }
    }, [nodeData?.data.contents, nodeId, updateNodeSize]); // 콘텐츠가 바뀌면 재측정

    if (!nodeData) return null;

    const { x, y, width, height, data } = nodeData;
    const isRoot = nodeData.type === "root";

    const { addNodeDirection } = nodeData;

    return (
        <foreignObject
            x={x}
            y={y}
            width={width || 200}
            height={height || 200} // NodeCenter는 원형이라 높이가 더 클 수 있음
            data-node-id={nodeId}
            className="overflow-visible"
        >
            <div ref={contentRef} className="inline-block">
                {isRoot ? (
                    /* 루트 노드일 때 */
                    <NodeCenter
                        data-action="select"
                        username={data.contents}
                        onAdd={(direction) => addNode(nodeId, "child", direction)}
                    />
                ) : (
                    /* 일반 노드일 때 */
                    <Node>
                        <Node.AddNode
                            data-direction={addNodeDirection}
                            data-action="add-child"
                            direction={addNodeDirection}
                            color={"blue"}
                            onClick={() => addNode(nodeId, "child", addNodeDirection)}
                        />
                        <Node.Content
                            data-action="select"
                            size={"sm"}
                            color={"blue"}
                            onClick={() => console.log(`클릭: ${data.contents}`)}
                        >
                            {data.contents || "하위 내용"}
                        </Node.Content>
                    </Node>
                )}
            </div>
        </foreignObject>
    );
}
