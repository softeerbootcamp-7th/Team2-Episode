import { useEffect } from "react";

import { useMindMapCore } from "@/features/mindmap/hooks/useMindmapContext";

/** 브라우저 외부 이벤트를 감지하고 mindmap 내부 broker로 전달 */
export function useViewportEvents() {
    const mindmap = useMindMapCore(); // 코어에서 broker를 가져오기 위함

    useEffect(() => {
        if (!mindmap || !mindmap.getIsReady()) return;

        const svg = mindmap.getCanvas();
        if (!svg) return;

        const broker = mindmap.getBroker();
        // 1. 휠 이벤트 전달
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            broker.publish("RAW_WHEEL", e);
        };

        // 2. 키보드 이벤트 전달
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                broker.publish("NODE_DELETE", e);
                return;
            }
            // if (!(e.ctrlKey || e.metaKey)) return;
            broker.publish("RAW_KEYDOWN", e);
        };

        // 3. 마우스 이벤트 전달
        const handleMouseDown = (e: MouseEvent) => {
            mindmap.handleMouseDown(e as unknown as React.MouseEvent);
        };

        // 우클릭 기본 동작 차단, 패닝으로 사용
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        const handleMouseMove = (e: MouseEvent) => broker.publish("RAW_MOUSE_MOVE", e);
        const handleMouseUp = (e: MouseEvent) => broker.publish("RAW_MOUSE_UP", e);

        // 이벤트 등록
        svg.addEventListener("wheel", handleWheel, { passive: false });
        svg.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("keydown", handleKeyDown);
        svg.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mouseleave", handleMouseUp);

        return () => {
            svg.removeEventListener("wheel", handleWheel);
            window.removeEventListener("keydown", handleKeyDown);
            svg.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("mouseleave", handleMouseUp);
        };
    }, [mindmap]);
}
