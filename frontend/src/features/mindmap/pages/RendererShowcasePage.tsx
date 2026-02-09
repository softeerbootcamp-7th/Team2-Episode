import { useEffect, useRef, useState } from "react";

import { useViewport } from "@/features/mindmap/node/hooks/useViewport";
import { useViewportEvents } from "@/features/mindmap/node/hooks/useViewportEvents";
import { ViewportProvider } from "@/features/mindmap/providers/ViewportProvider";
import { NodeElement } from "@/features/mindmap/types/mindmapType";
import Renderer from "@/features/mindmap/utils/Renderer";
import { Rect } from "@/features/quad_tree/types/rect";

const DEPTH_COLORS = ["#334155", "#6366f1", "#a855f7", "#ec4899", "#ef4444"];

export const RendererContent = () => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const nodeIndexRef = useRef(0);
    const [nodes, setNodes] = useState<NodeElement[]>([]);
    const [rebuildCount, setRebuildCount] = useState(0);
    const [quadCells, setQuadCells] = useState<{ rect: Rect; depth: number }[]>([]);
    const [currentQTBounds, setCurrentQTBounds] = useState<Rect | null>(null);
    const [innerBounds, setInnerBounds] = useState<Rect | null>(null);

    const rendererRef = useViewport();
    useViewportEvents(svgRef);

    // 초기화: 루트 노드 생성 및 Renderer 세팅
    useEffect(() => {
        if (!svgRef.current || rendererRef.current) return;

        const root: NodeElement = {
            id: "root",
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            parentId: "",
            nextId: null,
            prevId: null,
            firstChildId: null,
            lastChildId: null,
            type: "root",
            data: { contents: "Central Root" },
        };

        setNodes([root]);
        const newRenderer = new Renderer(svgRef.current, root);
        rendererRef.current = newRenderer;

        updateVisualization();
    }, []);

    // 시각화 업데이트 헬퍼
    const updateVisualization = () => {
        const renderer = rendererRef.current;
        if (!renderer) return;

        const qt = renderer.getQuadTree();
        setQuadCells(qt.getAllNodes());
        setCurrentQTBounds(qt.getBounds());
        setInnerBounds(qt.getInnerBounds());
    };

    const addNodeAt = (targetX: number, targetY: number, label: string) => {
        const renderer = rendererRef.current;
        if (!renderer) return;

        const qt = renderer.getQuadTree();
        const prevBounds = qt.getBounds();

        const newNode: NodeElement = {
            id: `node-${nodeIndexRef.current++}`,
            x: targetX,
            y: targetY,
            width: 160,
            height: 80,
            parentId: "root",
            nextId: null,
            prevId: null,
            firstChildId: null,
            lastChildId: null,
            type: "normal",
            data: { contents: label },
        };

        qt.insert({ x: targetX, y: targetY });

        const nextBounds = qt.getBounds();
        if (prevBounds.maxX - prevBounds.minX !== nextBounds.maxX - nextBounds.minX) {
            setRebuildCount((prev) => prev + 1);
        }

        setNodes((prev) => [...prev, newNode]);
        updateVisualization();
    };

    const handleAddCenter = () => {
        if (!currentQTBounds) return;
        const x = (currentQTBounds.minX + currentQTBounds.maxX) / 2 + (Math.random() - 0.5) * 100;
        const y = (currentQTBounds.minY + currentQTBounds.maxY) / 2 + (Math.random() - 0.5) * 100;
        addNodeAt(x, y, "Center Node");
    };

    const handleAddBoundary = () => {
        if (!currentQTBounds || !innerBounds) return;
        // 황색 점선(InnerBounds)을 살짝 넘기는 위치 (우하단 끝)
        const x = innerBounds.maxX + 10;
        const y = innerBounds.maxY + 10;
        addNodeAt(x, y, "Boundary Node");
    };

    return (
        <div className="fixed inset-0 overflow-hidden bg-slate-950 text-white">
            <div className="absolute left-6 top-6 z-20 flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/20 shadow-2xl">
                    <button
                        onClick={handleAddCenter}
                        className="rounded-lg bg-indigo-600 px-4 py-2 font-bold hover:bg-indigo-500 transition-colors"
                    >
                        Add Center
                    </button>
                    <button
                        onClick={handleAddBoundary}
                        className="rounded-lg bg-rose-600 px-4 py-2 font-bold hover:bg-rose-500 transition-colors"
                    >
                        Add Boundary
                    </button>
                    <div className="h-8 w-px bg-white/20 mx-2" />
                    <div className="text-sm">
                        Rebuilds: <span className="text-rose-400 font-mono text-lg">{rebuildCount}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 px-2 text-[10px] font-mono text-slate-500 uppercase">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-rose-500" /> QT Full Area
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-amber-500 border-dashed" /> 90% Safe Zone
                    </div>
                </div>
            </div>

            <svg ref={svgRef} className="h-full w-full outline-none cursor-move">
                {/* 1. 쿼드 트리 격자 */}
                {quadCells.map(({ rect, depth }, i) => (
                    <rect
                        key={`${depth}-${i}`}
                        x={rect.minX}
                        y={rect.minY}
                        width={rect.maxX - rect.minX}
                        height={rect.maxY - rect.minY}
                        fill="none"
                        stroke={DEPTH_COLORS[depth % DEPTH_COLORS.length]}
                        strokeWidth={1}
                        opacity={0.3}
                    />
                ))}

                {/* 2. 전체 영역 & 바운더리 */}
                {currentQTBounds && (
                    <rect
                        x={currentQTBounds.minX}
                        y={currentQTBounds.minY}
                        width={currentQTBounds.maxX - currentQTBounds.minX}
                        height={currentQTBounds.maxY - currentQTBounds.minY}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth={4}
                        opacity={0.4}
                    />
                )}
                {innerBounds && (
                    <rect
                        x={innerBounds.minX}
                        y={innerBounds.minY}
                        width={innerBounds.maxX - innerBounds.minX}
                        height={innerBounds.maxY - innerBounds.minY}
                        fill="rgba(245, 158, 11, 0.05)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="10 5"
                    />
                )}

                {/* 3. 노드 렌더링 */}
                {nodes.map((node) => (
                    <g key={node.id} transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}>
                        <rect
                            width={node.width}
                            height={node.height}
                            rx={8}
                            fill={node.type === "root" ? "#4f46e5" : "#1e293b"}
                            stroke="#334155"
                            strokeWidth={2}
                        />
                        <text
                            x={node.width / 2}
                            y={node.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            className="text-xs font-medium"
                        >
                            {node.data.contents}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

const ViewportShowcase = () => (
    <ViewportProvider>
        <RendererContent />
    </ViewportProvider>
);

export default ViewportShowcase;
