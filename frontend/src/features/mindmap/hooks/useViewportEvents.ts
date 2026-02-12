import { useEffect } from "react";

import { useMindMapCore } from "@/features/mindmap/hooks/useMindmapContext";

/** 브라우저 외부 이벤트를 감지하고 mindmap 내부 broker로 전달 */
export function useViewportEvents(canvasRef: React.RefObject<SVGSVGElement | null>) {
    const mindmap = useMindMapCore(); // 코어에서 broker를 가져오기 위함
    const broker = mindmap.getBroker();

    useEffect(() => {
        const svg = canvasRef.current;
        if (!svg) return;

        // 1. 휠 이벤트 전달
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            broker.publish("RAW_WHEEL", e);
        };

        // 2. 키보드 이벤트 전달
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            broker.publish("RAW_KEYDOWN", e);
        };

        // 3. 마우스 이벤트 전달
        const handleMouseDown = (e: MouseEvent) => broker.publish("RAW_MOUSE_DOWN", e);
        const handleMouseMove = (e: MouseEvent) => broker.publish("RAW_MOUSE_MOVE", e);
        const handleMouseUp = (e: MouseEvent) => broker.publish("RAW_MOUSE_UP", e);

        // 이벤트 등록
        svg.addEventListener("wheel", handleWheel, { passive: false });
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
    }, [canvasRef, broker]);
}
