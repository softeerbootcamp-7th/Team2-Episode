import { memo, useEffect, useRef, useState } from "react";

import { CollaboratorList } from "@/features/mindmap/shared_mindmap/components/CollaboratorList";
import { CursorOverlay } from "@/features/mindmap/shared_mindmap/components/CursorsOverlay";
import { useNode } from "@/features/mindmap/shared_mindmap/hooks/useNode";
import { useNodeResizeObserver } from "@/features/mindmap/shared_mindmap/hooks/useNodeResizeObserver";
import { useSharedMindmap } from "@/features/mindmap/shared_mindmap/hooks/useSharedMindmap";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorManager";
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
        e.stopPropagation();
        controller.addChildNode(nodeId);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type !== "root") {
            controller.deleteNode(nodeId);
        }
    };

    const style: React.CSSProperties = {
        position: "absolute",
        left: node.x,
        top: node.y,
        minWidth: "100px",
        minHeight: "40px",
        backgroundColor: node.type === "root" ? "#FFB74D" : "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
        zIndex: node.type === "root" ? 10 : 1,
        whiteSpace: "nowrap",
        padding: "20px",
        border: "1px solid #ddd", // 가시성을 위해 살짝 추가
        borderRadius: "8px",
    };

    return (
        <>
            <div ref={nodeRef} style={style} onPointerDown={(e) => e.stopPropagation()}>
                <div style={{ fontWeight: "bold", marginBottom: "5px", width: "200px", textAlign: "center" }}>
                    {node.id}
                    <br />
                    <span style={{ fontSize: "10px", color: "#666" }}>
                        Parent: {node.parentId || "None"} <br />({Math.round(node.x)}, {Math.round(node.y)})
                    </span>
                </div>

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

            {/* 3. 자식 노드 렌더링 시 controller.container를 직접 참조하므로 
                이미 등록된 자식 리스트가 변경될 때만 리렌더링됩니다. */}
            {controller.container.getChildIds(nodeId).map((childId) => (
                <NodeItem key={childId} nodeId={childId} controller={controller} broker={broker} />
            ))}
        </>
    );
};
// (prevProps, nextProps) => {
//     // 4. props 비교 로직 (선택 사항)
//     // controller와 broker는 인스턴스이므로 보통 참조가 유지됩니다.
//     // nodeId가 같다면 굳이 다시 그릴 필요가 없습니다.
//     return prevProps.nodeId === nextProps.nodeId && prevProps.controller === nextProps.controller;
// },
// 표시 이름 설정 (디버깅 용이)

NodeItem.displayName = "NodeItem";

const btnStyle: React.CSSProperties = {
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: "12px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    background: "#f9f9f9",
};

const DUMMY_ROOM_ID = "ㅁ";

// ... (NodeItem 컴포넌트와 btnStyle은 기존과 동일하므로 생략)

export default function MindmapShowcaseV3() {
    const { controller, broker, collaboratorsManager } = useSharedMindmap({ roomId: DUMMY_ROOM_ID });

    // 1. Zoom & Pan State
    const [pan, setPan] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [scale, setScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // [추가] 컨테이너 참조를 위한 Ref
    const containerRef = useRef<HTMLDivElement>(null);

    // 2. Zoom Handler (useEffect를 이용한 수동 등록)
    useEffect(() => {
        const handleWheelNative = (e: WheelEvent) => {
            // 브라우저의 기본 스크롤 동작을 방지 (passive: false 설정 덕분에 에러가 나지 않음)
            e.preventDefault();

            const zoomSpeed = 0.001;
            const delta = -e.deltaY;

            setScale((prevScale) => {
                const newScale = Math.min(Math.max(prevScale + delta * zoomSpeed, 0.2), 3);
                return newScale;
            });
        };

        const container = containerRef.current;
        if (container) {
            // passive: false를 명시하여 preventDefault() 허용
            container.addEventListener("wheel", handleWheelNative, { passive: false });
        }

        return () => {
            if (container) {
                container.removeEventListener("wheel", handleWheelNative);
            }
        };
    }, []); // scale 의존성을 제거하기 위해 setScale 내부에서 함수형 업데이트 사용

    // 3. Panning Handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setIsPanning(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const worldX = (e.clientX - pan.x) / scale;
        const worldY = (e.clientY - pan.y) / scale;

        collaboratorsManager.updateCursor(worldX, worldY);

        if (!isPanning) return;

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
            {/* UI 컨트롤러 */}
            <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, display: "flex", gap: "10px" }}>
                <div
                    style={{
                        background: "white",
                        padding: "8px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    }}
                >
                    Zoom: <b>{Math.round(scale * 100)}%</b>
                </div>
                <button
                    onClick={() => {
                        setScale(1);
                        setPan({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    }}
                    style={topBtnStyle}
                >
                    Center
                </button>
                <button
                    onClick={() => controller.resetMindMap()}
                    style={{ ...topBtnStyle, backgroundColor: "#FF5252" }}
                >
                    Reset
                </button>
            </div>

            <CursorOverlay manager={collaboratorsManager} pan={pan} scale={scale} />
            <CollaboratorList manager={collaboratorsManager} />

            <div
                ref={containerRef} // [수정] ref 연결
                style={{
                    width: "100vw",
                    height: "100vh",
                    overflow: "hidden",
                    background: "#f0f2f5",
                    cursor: isPanning ? "grabbing" : "grab",
                    touchAction: "none",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                /* [수정] onWheel 제거 (useEffect에서 처리) */
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        transformOrigin: "0 0",
                        willChange: "transform",
                    }}
                >
                    <NodeItem broker={broker} nodeId={controller.container.getRootId()} controller={controller} />
                </div>
            </div>
        </>
    );
}

const topBtnStyle: React.CSSProperties = {
    padding: "8px 16px",
    backgroundColor: "#4A90E2",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
};
