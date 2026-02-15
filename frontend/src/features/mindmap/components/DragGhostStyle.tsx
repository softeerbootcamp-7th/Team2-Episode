import { useMindMapDragSession } from "@/features/mindmap/hooks/useMindmapContext";
/**
 * 드래그 세션(start/end)에서만 style 텍스트가 바뀌도록 분리
 * - 원본(static-graph)만 흐리게 처리
 * - moving-fragment는 영향 받지 않음
 */
export default function DragGhostStyle() {
    const { isDragging, dragSubtreeIds } = useMindMapDragSession();

    if (!isDragging || !dragSubtreeIds || dragSubtreeIds.size === 0) return null;

    const escapeAttr = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const rules: string[] = [];
    dragSubtreeIds.forEach((id) => {
        const safe = escapeAttr(String(id));
        rules.push(`.static-graph [data-node-id="${safe}"] { opacity: 0.2; }`);
        rules.push(`.static-graph path[data-edge-child="${safe}"] { opacity: 0.2; }`);
    });

    return <style>{rules.join("\n")}</style>;
}
