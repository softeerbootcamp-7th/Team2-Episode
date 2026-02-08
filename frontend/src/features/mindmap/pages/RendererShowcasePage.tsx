import { useEffect, useMemo, useRef } from "react";

import { useViewport } from "@/features/mindmap/node/hooks/useViewport";
import { useViewportEvents } from "@/features/mindmap/node/hooks/useViewportEvents";
import { ViewportProvider } from "@/features/mindmap/providers/ViewportProvider";
import { NodeElement } from "@/features/mindmap/types/mindmapType";
import Renderer from "@/features/mindmap/utils/core/Renderer";

/**
 * 샘플 데이터 생성 로직
 */
const createSampleNodes = (): NodeElement[] => {
    const rootId = "root";
    return [
        {
            id: rootId,
            x: 0,
            y: 0,
            width: 320,
            height: 160,
            parentId: "",
            nextId: null,
            prevId: null,
            firstChildId: null,
            lastChildId: null,
            type: "root",
            data: { contents: "Renderer Root" },
        },
        {
            id: "child-1",
            x: -600,
            y: -400,
            width: 240,
            height: 120,
            parentId: rootId,
            nextId: "child-2",
            prevId: null,
            firstChildId: null,
            lastChildId: null,
            type: "normal",
            data: { contents: "Left Top" },
        },
        {
            id: "child-2",
            x: 600,
            y: -300,
            width: 240,
            height: 120,
            parentId: rootId,
            nextId: "child-3",
            prevId: "child-1",
            firstChildId: null,
            lastChildId: null,
            type: "normal",
            data: { contents: "Right Top" },
        },
        {
            id: "child-3",
            x: 0,
            y: 500,
            width: 260,
            height: 130,
            parentId: rootId,
            nextId: null,
            prevId: "child-2",
            firstChildId: null,
            lastChildId: null,
            type: "normal",
            data: { contents: "Bottom Node" },
        },
    ];
};

/**
 * 실제 렌더링을 담당하는 내부 컴포넌트
 */
export const RendererContent = () => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    // 1. useViewport를 통해 Provider에 저장된 공유 rendererRef를 가져옵니다.
    const rendererRef = useViewport();

    // 2. useViewportEvents를 호출하여 마우스(드래그, 휠) 및 키보드(Ctrl +/-) 이벤트를 연결합니다.
    useViewportEvents(svgRef);

    const nodes = useMemo(() => createSampleNodes(), []);
    const rootNode = nodes[0];

    // 3. Renderer 초기화: 최초 렌더링 시 딱 한 번만 인스턴스를 생성하여 ref에 저장합니다.
    useEffect(() => {
        if (!svgRef.current || rendererRef.current || !rootNode) return;
        rendererRef.current = new Renderer(svgRef.current, rootNode);
    }, [rootNode, rendererRef]);

    const handleNodeClick = (node: NodeElement) => {
        rendererRef.current?.focusNode(node);
    };

    return (
        <div className="fixed inset-0 overflow-hidden bg-slate-50">
            <svg ref={svgRef} className="h-full w-full outline-none">
                {nodes.map((node) => (
                    <g
                        key={node.id}
                        transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
                        onClick={() => handleNodeClick(node)}
                        style={{ cursor: "pointer" }}
                    >
                        <rect
                            width={node.width}
                            height={node.height}
                            rx={node.type === "root" ? 16 : 8}
                            fill={node.type === "root" ? "#4f46e5" : "#ffffff"}
                            stroke="#cbd5e1"
                            strokeWidth={2}
                        />
                        <text
                            x={node.width / 2}
                            y={node.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={node.type === "root" ? "#ffffff" : "#1e293b"}
                            className="select-none pointer-events-none"
                        >
                            {node.data.contents}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};
/**
 * 최종 Showcase 페이지 컴포넌트
 * ViewportProvider로 감싸서 하위 컴포넌트들이 Renderer 인스턴스를 공유할 수 있게 합니다.
 */
const RendererShowcasePage = () => {
    return (
        <ViewportProvider>
            <RendererContent />
        </ViewportProvider>
    );
};

export default RendererShowcasePage;
