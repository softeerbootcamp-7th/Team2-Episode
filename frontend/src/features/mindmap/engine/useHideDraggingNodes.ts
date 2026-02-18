import { useEffect, useMemo } from "react";

import { useMindmapDragSession } from "@/features/mindmap/engine/hooks";

export function useHideDraggingNodes() {
    const { isDragging, dragSubtreeIds } = useMindmapDragSession();

    const escapeAttr = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const cssRules = useMemo(() => {
        if (!isDragging || !dragSubtreeIds || dragSubtreeIds.size === 0) return "";

        const rules: string[] = [];
        dragSubtreeIds.forEach((id) => {
            const safe = escapeAttr(String(id));
            rules.push(`.static-graph [data-node-id="${safe}"] { opacity: 0.2; }`);
            rules.push(`.static-graph path[data-edge-to="${safe}"] { opacity: 0.2; }`);
        });
        return rules.join("\n");
    }, [isDragging, dragSubtreeIds]);

    useEffect(() => {
        if (!cssRules) return;

        const styleEl = document.createElement("style");
        styleEl.setAttribute("data-drag-ghost", "true");
        styleEl.innerHTML = cssRules;
        document.head.appendChild(styleEl);

        return () => {
            if (document.head.contains(styleEl)) {
                document.head.removeChild(styleEl);
            }
        };
    }, [cssRules]);
}
