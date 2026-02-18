// frontend/src/features/mindmap/engine/useMindmapEngineEvents.ts
import { useEffect } from "react";

import { useMindmapEngineContext } from "@/features/mindmap/engine/hooks";

export function useMindmapEngineEvents() {
    const engine = useMindmapEngineContext();

    useEffect(() => {
        const svg = engine.getCanvas();
        if (!svg) return;

        const onWheel = (e: WheelEvent) => engine.input.wheel(e);
        const onContextMenu = (e: MouseEvent) => e.preventDefault();

        const onMouseDown = (e: MouseEvent) => engine.input.pointerDown(e);
        const onMouseMove = (e: MouseEvent) => engine.input.pointerMove(e);
        const onMouseUp = (e: MouseEvent) => engine.input.pointerUp(e);
        const onMouseLeave = (e: MouseEvent) => engine.input.pointerUp(e);

        const onKeyDown = (e: KeyboardEvent) => engine.input.keyDown(e);

        // ✅ NEW
        const onDblClick = (e: MouseEvent) => engine.input.doubleClick(e);

        svg.addEventListener("wheel", onWheel, { passive: false });
        svg.addEventListener("contextmenu", onContextMenu);
        svg.addEventListener("mousedown", onMouseDown);
        svg.addEventListener("dblclick", onDblClick);

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("mouseleave", onMouseLeave);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            svg.removeEventListener("wheel", onWheel);
            svg.removeEventListener("contextmenu", onContextMenu);
            svg.removeEventListener("mousedown", onMouseDown);
            svg.removeEventListener("dblclick", onDblClick);

            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("mouseleave", onMouseLeave);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [engine]);
}
