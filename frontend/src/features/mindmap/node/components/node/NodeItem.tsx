import { useEffect, useRef } from "react";

import { useMindMapActions } from "@/features/mindmap/hooks/useMindmapContext";
import { useMindMapNode } from "@/features/mindmap/hooks/useMindmapNode";
import { Node } from "@/features/mindmap/node/components/node/Node";
import NodeCenter from "@/features/mindmap/node/components/node_center/NodeCenter";
import { NodeId } from "@/features/mindmap/types/node";

export default function NodeItem({ nodeId }: { nodeId: NodeId }) {
    const nodeData = useMindMapNode(nodeId);
    const { updateNodeSize } = useMindMapActions();

    const contentRef = useRef<HTMLDivElement>(null);

    if (!nodeData) return null;

    const { x, y, width, height, data } = nodeData;
    const isRoot = nodeData.type === "root";
    const w = width || 200;
    const h = height || 200;

    const { addNodeDirection } = nodeData;

    useEffect(() => {
        if (!contentRef.current || !nodeData) return;

        const rect = contentRef.current.getBoundingClientRect();
        const svg = contentRef.current.closest("svg") as SVGSVGElement;
        const svgRect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;

        const scaleX = svgRect.width / viewBox.width;
        const scaleY = svgRect.height / viewBox.height;

        const worldWidth = rect.width / scaleX;
        const worldHeight = rect.height / scaleY;

        updateNodeSize(nodeId, worldWidth, worldHeight);
    }, [nodeData?.data.contents, nodeId]);

    return (
        <foreignObject
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            data-node-id={nodeId}
            className="overflow-visible"
        >
            <div ref={contentRef} className="inline-block">
                {isRoot ? (
                    /* 루트 노드일 때 */
                    <NodeCenter data-action="select" username={data.contents}>
                        {/* 좌표 디버깅용 (개발 모드에서만 보이게) */}
                        <div className="absolute -top-6 left-0 text-[10px] bg-black text-white p-1 whitespace-nowrap opacity-70 pointer-events-none">
                            x: {Math.round(x)}, y: {Math.round(y)} | w: {Math.round(width)}, h: {Math.round(height)}
                        </div>
                    </NodeCenter>
                ) : (
                    /* 일반 노드일 때 */
                    <Node>
                        <Node.AddNode
                            data-direction={addNodeDirection}
                            data-action="add-child"
                            direction={addNodeDirection}
                            color={"violet"}
                        />
                        <Node.Content
                            data-action="select"
                            size={"sm"}
                            color={"violet"}
                            onClick={() => console.log(`클릭: ${data.contents}`)}
                        >
                            {data.contents || "하위 내용"}
                            {/* 좌표 디버깅용 (개발 모드에서만 보이게) */}
                            <div className="absolute -top-6 left-0 text-[10px] bg-black text-white p-1 whitespace-nowrap opacity-70 pointer-events-none">
                                x: {Math.round(x)}, y: {Math.round(y)} | w: {Math.round(width)}, h: {Math.round(height)}
                            </div>
                        </Node.Content>
                    </Node>
                )}
            </div>
        </foreignObject>
    );
}
