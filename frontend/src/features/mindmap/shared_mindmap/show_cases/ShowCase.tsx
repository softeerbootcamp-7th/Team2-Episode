import { useEffect, useRef, useState } from "react";

import { useNode } from "@/features/mindmap/shared_mindmap/hooks/useNode";
import { useNodeResizeObserver } from "@/features/mindmap/shared_mindmap/hooks/useNodeResizeObserver";
import { useSharedMindmap } from "@/features/mindmap/shared_mindmap/hooks/useSharedMindmap";
import SharedMindMapController from "@/features/mindmap/shared_mindmap/utils/SharedMindmapController";
import { NodeId } from "@/features/mindmap/types/mindmap";
import { EventBroker } from "@/utils/EventBroker";

// [Read Hook] 특정 노드의 데이터 변경을 구독

// [View Logic] ResizeObserver 대신 getBoundingClientRect 사용

type NodeItemProps = {
    nodeId: NodeId;
    controller: SharedMindMapController;
    broker: EventBroker<NodeId>;
};

const NodeItem = ({ nodeId, controller, broker }: NodeItemProps) => {
    const node = useNode(nodeId, controller, broker);

    const nodeRef = useNodeResizeObserver({
        nodeId,
        node,
        onResize: (args) => controller.updateNodeSize({ ...args, nodeId }),
    });

    if (!node) return null;

    const handleAddChild = (e: React.MouseEvent) => {
        e.stopPropagation(); // 캔버스 Pan 방지
        controller.addChildNode(nodeId);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type !== "root") {
            controller.deleteNode(nodeId);
        }
    };

    // --- Style ---
    const style: React.CSSProperties = {
        position: "absolute",
        left: node.x, // Controller가 계산해준 좌표 사용
        top: node.y,

        // 스타일링
        minWidth: "100px",
        minHeight: "40px",
        backgroundColor: node.type === "root" ? "#FFB74D" : "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)", // 부드러운 애니메이션
        zIndex: node.type === "root" ? 10 : 1,
        whiteSpace: "nowrap",
        padding: "20px",
    };

    return (
        <>
            <div
                ref={nodeRef}
                style={style}
                onPointerDown={(e) => e.stopPropagation()} // 드래그 방지
            >
                {/* 노드 내용 */}
                <div style={{ fontWeight: "bold", marginBottom: "5px", width: "200px" }}>
                    {node.id}
                    <br />
                    {node.parentId}
                    <br />({node.x}, {node.y})
                </div>

                {/* 컨트롤 버튼 */}
                <div style={{ display: "flex", gap: "5px" }}>
                    <button onClick={handleAddChild} style={btnStyle}>
                        +
                    </button>
                    {node.type !== "root" && (
                        <button onClick={handleDelete} style={{ ...btnStyle, color: "red" }}>
                            x
                        </button>
                    )}
                </div>
            </div>

            {/* 자식 노드 재귀 렌더링 */}
            {controller.container.getChildIds(nodeId).map((childId) => (
                <NodeItem key={childId} nodeId={childId} controller={controller} broker={broker} />
            ))}
        </>
    );
};

const btnStyle: React.CSSProperties = {
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: "12px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    background: "#f9f9f9",
};

const DUMMY_ROOM_ID = "ㅁ";
export default function MindmapShowcaseV3() {
    const { controller, connectionStatus, broker } = useSharedMindmap({ roomId: DUMMY_ROOM_ID });

    // 2. Canvas Panning State
    const [pan, setPan] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [isPanning, setIsPanning] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // 3. Keyboard Shortcuts (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

            const isCtrl = e.ctrlKey || e.metaKey;

            if (isCtrl && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                controller.undo(); // Controller에게 위임
            }
            if ((isCtrl && e.key === "y") || (isCtrl && e.key === "z" && e.shiftKey)) {
                e.preventDefault();
                controller.redo(); // Controller에게 위임
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [controller]);

    // --- Panning Handlers ---
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setIsPanning(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsPanning(false);
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    };

    return (
        <>
            <button
                onClick={() => controller.resetMindMap()}
                style={{
                    padding: "8px 16px",
                    backgroundColor: "#FF5252",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                }}
            >
                초기화 (Reset)
            </button>
            <div
                style={{
                    width: "100vw",
                    height: "100vh",
                    overflow: "hidden",
                    background: "#f0f2f5",
                    cursor: isPanning ? "grabbing" : "grab",
                    touchAction: "none",
                    userSelect: "none",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Status Indicator */}
                <div
                    style={{
                        position: "absolute",
                        top: 20,
                        left: 20,
                        padding: "8px 12px",
                        background: "white",
                        borderRadius: "8px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        zIndex: 100,
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <div
                        style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: connectionStatus === "connected" ? "#4CAF50" : "#FF5252",
                        }}
                    />

                    <span>
                        Status: <b>{connectionStatus}</b>
                    </span>
                </div>

                {/* Canvas Content */}
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        transform: `translate(${pan.x}px, ${pan.y}px)`, // Panning 적용
                        willChange: "transform",
                    }}
                >
                    {/* Root Node 렌더링 시작 */}
                    <NodeItem broker={broker} nodeId={controller.container.getRootId()} controller={controller} />
                </div>
            </div>
        </>
    );
}
