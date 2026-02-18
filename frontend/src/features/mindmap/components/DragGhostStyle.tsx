import { useMindmapDragSession } from "@/features/mindmap/engine/hooks";

export default function DragGhostStyle() {
    const { isDragging, dragSubtreeIds } = useMindmapDragSession();

    if (!isDragging || !dragSubtreeIds || dragSubtreeIds.size === 0) return null;

    const escapeAttr = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const rules: string[] = [];
    dragSubtreeIds.forEach((id) => {
        const safe = escapeAttr(String(id));
        rules.push(`.static-graph [data-node-id="${safe}"] { opacity: 0.2; }`);
        rules.push(`.static-graph path[data-edge-to="${safe}"] { opacity: 0.2; }`);
    });

    return <style>{rules.join("\n")}</style>;
}
