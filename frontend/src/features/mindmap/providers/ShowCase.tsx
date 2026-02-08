import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useMindmapInteractionHandler } from "@/features/mindmap/hooks/useMindmapInterctionHandler";
import {
    MindMapProvider,
    useMindmapActions,
    useMindmapContainer,
    useMindmapVersion,
    useNode,
} from "@/features/mindmap/providers/MindmapProvider";

const GridLayer = memo(({ transform }: { transform: { x: number; y: number; scale: number } }) => {
    const gridSize = 100;
    const labels = useMemo(() => {
        const temp = [];
        for (let i = -50; i <= 50; i++) temp.push(i * gridSize);
        return temp;
    }, []);

    return (
        <svg
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                backgroundColor: "#f8fafc",
                zIndex: 0,
            }}
        >
            <defs>
                <pattern id="gridPattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pos) => (
                        <React.Fragment key={pos}>
                            <line x1={pos} y1="0" x2={pos} y2={gridSize} stroke="#e2e8f0" strokeWidth="0.5" />
                            <line x1="0" y1={pos} x2={gridSize} y2={pos} stroke="#e2e8f0" strokeWidth="0.5" />
                        </React.Fragment>
                    ))}
                    <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#cbd5e1" strokeWidth="1" />
                </pattern>
            </defs>
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#gridPattern)" />
                <line x1="-5000" y1="0" x2="5000" y2="0" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" />
                <line x1="0" y1="-5000" x2="0" y2="5000" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" />
                {labels.map((val) => (
                    <React.Fragment key={val}>
                        <text x={val} y={20} fontSize={12 / transform.scale} fill="#64748b" textAnchor="middle">
                            {val}
                        </text>
                        <text x={10} y={val} fontSize={12 / transform.scale} fill="#64748b" dominantBaseline="middle">
                            {val}
                        </text>
                    </React.Fragment>
                ))}
            </g>
        </svg>
    );
});
GridLayer.displayName = "GridLayer";

const Edge = memo(
    ({
        fromId,
        toId,
        dragDelta,
    }: {
        fromId: string;
        toId: string;
        parentId: string;
        dragDelta?: { x: number; y: number };
    }) => {
        const fromNode = useNode(fromId);
        const toNode = useNode(toId);

        if (!fromNode || !toNode || !fromNode.width || !toNode.width) return null;

        // 1. Path 계산 (기존 좌표 그대로 사용 -> 재계산 비용 0)
        const startX = fromNode.x + fromNode.width;
        const startY = fromNode.y + fromNode.height / 2;
        const endX = toNode.x;
        const endY = toNode.y + toNode.height / 2;

        const controlPointX = startX + (endX - startX) / 2;
        const pathData = `M ${startX} ${startY} C ${controlPointX} ${startY}, ${controlPointX} ${endY}, ${endX} ${endY}`;

        // 2. 드래그 중이면 CSS Transform 적용
        const style: React.CSSProperties = {
            transition: dragDelta ? "none" : "d 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
            // ✨ dragDelta가 있으면 해당 만큼 이동시킴 (GPU 가속)
            transform: dragDelta ? `translate(${dragDelta.x}px, ${dragDelta.y}px)` : undefined,
        };

        return <path d={pathData} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" style={style} />;
    },
);
Edge.displayName = "Edge";

const EdgeLayer = ({ dragSubtreeIds, draggingNodeId, dragDelta }: any) => {
    const container = useMindmapContainer();
    const version = useMindmapVersion();
    const edgePairs = useMemo(() => {
        return Array.from(container.nodes.keys()).flatMap((parentId) => {
            const children = container.getChildIds(parentId);
            return children.map((childId) => ({
                id: `${parentId}-${childId}`,
                fromId: parentId,
                toId: childId,
                parentId,
            }));
        });
    }, [container.nodes.size, version]);
    return (
        <svg
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "1px",
                height: "1px",
                overflow: "visible",
                pointerEvents: "none",
                zIndex: 0,
            }}
        >
            {edgePairs.map((edge) => {
                // ✨ 2. 엣지 분류 로직

                // Case A: 드래그 중인 노드와 부모를 잇는 선 (Incoming) -> 숨김!
                if (draggingNodeId && edge.toId === draggingNodeId) {
                    return null;
                }

                // Case B: 서브트리 내부의 선 (Internal) -> 같이 이동!
                const isInternal = dragSubtreeIds?.has(edge.fromId) && dragSubtreeIds?.has(edge.toId);

                return (
                    <Edge
                        key={edge.id}
                        fromId={edge.fromId}
                        toId={edge.toId}
                        parentId={edge.parentId}
                        // 내부 선이라면 delta를 전달
                        dragDelta={isInternal ? dragDelta : undefined}
                    />
                );
            })}
        </svg>
    );
};
EdgeLayer.displayName = "EdgeLayer";

const NodeView = memo(({ nodeId, dragDelta }: { nodeId: string; dragDelta?: { x: number; y: number } }) => {
    const node = useNode(nodeId);
    const { addNode, deleteNode, updateNodeSize } = useMindmapActions();
    const ref = useRef<HTMLDivElement>(null);

    if (!node) return null;

    useLayoutEffect(() => {
        if (ref.current && node) {
            const { offsetWidth, offsetHeight } = ref.current;
            updateNodeSize(nodeId, offsetWidth, offsetHeight);
        }
    }, [node?.width, node?.height, nodeId, updateNodeSize]);

    const currentX = node.x + (dragDelta?.x || 0);
    const currentY = node.y + (dragDelta?.y || 0);
    const isDragging = !!dragDelta;

    return (
        <div
            ref={ref}
            className="node-group"
            data-node-id={nodeId}
            style={{
                position: "absolute",
                transform: `translate(${currentX}px, ${currentY}px)`,
                transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                padding: "8px 16px",
                border: `2px solid ${node.type === "root" ? "#3b82f6" : "#cbd5e1"}`,
                backgroundColor: node.type === "root" ? "#eff6ff" : "white",
                borderRadius: "8px",
                whiteSpace: "nowrap",
                cursor: node.type === "root" ? "default" : "grab",
                zIndex: isDragging ? 100 : 1,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                pointerEvents: isDragging ? "none" : "auto",
            }}
        >
            <div className="select-none" style={{ fontWeight: 600 }}>
                {node.id.slice(0, 4)}asdfasdf
            </div>

            <div
                className="action-buttons"
                style={{ position: "absolute", top: "-12px", right: "-12px", display: "flex", gap: "4px", zIndex: 100 }}
            >
                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        addNode(nodeId);
                    }}
                    style={buttonStyle("#3b82f6")}
                >
                    +
                </button>

                {node.type !== "root" && (
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("삭제?")) deleteNode(nodeId);
                        }}
                        style={buttonStyle("#ef4444")}
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
});
NodeView.displayName = "NodeView";

export default function MindMapShowcase() {
    return (
        <MindMapProvider>
            <Canvas />
        </MindMapProvider>
    );
}

const GhostNode = memo(({ state }: { state: any }) => {
    if (!state.isVisible) return null;
    return (
        <div
            style={{
                position: "absolute",
                transform: `translate(${state.x}px, ${state.y}px)`,
                width: state.width,
                height: state.height,
                border: "2px dashed #3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                borderRadius: "8px",
                pointerEvents: "none",
                zIndex: 9999,
            }}
        />
    );
});
GhostNode.displayName = "GhostNode";

const Canvas = () => {
    const container = useMindmapContainer();

    const version = useMindmapVersion();

    const { forceLayout } = useMindmapActions();
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

    const { handlers, draggingNodeId, dragDelta, dragSubtreeIds } = useMindmapInteractionHandler(
        transform,
        setTransform,
    );

    const handleWheel = useCallback((e: React.WheelEvent) => {
        const zoomSpeed = 0.001;
        const minScale = 0.1;
        const maxScale = 3;

        setTransform((prev) => {
            const delta = -e.deltaY * zoomSpeed;
            const newScale = Math.min(Math.max(prev.scale + delta, minScale), maxScale);
            return { ...prev, scale: newScale };
        });
    }, []);

    useEffect(() => {
        forceLayout();
    }, [forceLayout]);

    const allNodeIds = useMemo(() => {
        return Array.from(container.nodes.keys());
    }, [container.nodes.size, version]);

    return (
        <div
            {...handlers}
            onWheel={handleWheel}
            style={{
                position: "relative",
                width: "100%",
                height: "100vh",
                overflow: "hidden",
                backgroundColor: "#f8fafc",
                touchAction: "none",
            }}
        >
            <GridLayer transform={transform} />

            <div
                style={{
                    transformOrigin: "0 0",
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    width: "100%",
                    height: "100%",
                    cursor: draggingNodeId ? "grabbing" : "grab",
                }}
            >
                <div style={{ pointerEvents: "auto" }}>
                    <EdgeLayer draggingNodeId={draggingNodeId} dragDelta={dragDelta} dragSubtreeIds={dragSubtreeIds} />
                    {allNodeIds.map((nodeId) => {
                        // ✨ [핵심 변경]
                        // "지금 그리는 노드(nodeId)가 움직여야 할 명단(Set)에 있는가?" 확인
                        const isMoving = dragSubtreeIds?.has(nodeId);

                        return (
                            <NodeView
                                key={nodeId}
                                nodeId={nodeId}
                                // 명단에 있으면 delta를 전달, 아니면 undefined
                                dragDelta={isMoving ? dragDelta : undefined}

                                // (선택사항) 드래그 중인 본체인지, 딸려오는 자식인지 구분하고 싶다면:
                                // isDraggingSource={nodeId === draggingNodeId}
                            />
                        );
                    })}
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    bottom: 20,
                    right: 20,
                    background: "white",
                    padding: 8,
                    borderRadius: 8,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
            >
                Zoom: {Math.round(transform.scale * 100)}%
            </div>
        </div>
    );
};

const buttonStyle = (color: string) => ({
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: color,
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
});
