import { useEffect, useRef } from "react";

import { useViewport } from "@/features/mindmap/node/hooks/useViewport";

/** 사용자의 입력 이벤트를 감지, 바인딩하고, Renderer에 명령을 내리는 로직 */
export const useViewportEvents = (svgRef: React.RefObject<SVGSVGElement | null>) => {
    // Provider에서 rendererRef 가져오기
    const rendererRef = useViewport();
    const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        //[zoom] 마우스 휠
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault(); // 브라우저 기본 스크롤 방지
            rendererRef.current?.zoomHandler(e.deltaY, e);
        };

        //[zoom] 키보드 (Ctrl + / -)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (["+", "=", "-"].includes(e.key)) {
                e.preventDefault(); // 브라우저 기본 확대 방지

                const delta = e.key === "-" ? 100 : -100;
                const rect = svg.getBoundingClientRect();

                // 키보드 줌은 마우스 위치가 없으므로 화면 중앙 좌표를 전달
                rendererRef.current?.zoomHandler(delta, {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                } as WheelEvent);
            }
        };

        //[panning] 마우스 드래그
        const handleMouseDown = (e: MouseEvent) => {
            dragRef.current = { isDragging: true, lastX: e.clientX, lastY: e.clientY };
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragRef.current.isDragging || !rendererRef.current) return;

            const dx = e.clientX - dragRef.current.lastX;
            const dy = e.clientY - dragRef.current.lastY;

            // Renderer에 이동량 전달
            rendererRef.current.panningHandler(dx, dy);

            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
        };

        const handleMouseUp = () => {
            dragRef.current.isDragging = false;
        };

        // 이벤트 리스너 등록
        svg.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("keydown", handleKeyDown);
        svg.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mouseleave", handleMouseUp);

        // cleanUp: 컴포넌트가 사라질 때 리스너 제거
        return () => {
            svg.removeEventListener("wheel", handleWheel);
            window.removeEventListener("keydown", handleKeyDown);
            svg.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("mouseleave", handleMouseUp);
        };
    }, [svgRef, rendererRef]);
};
