import { AddNodeDirection, NodeDirection, NodeElement } from "@/features/mindmap/types/node";

export const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
};

/** 고스트 노드의 엣지가 시작하는 점의 방향 */
export function resolveSide(targetNode: NodeElement, direction: NodeDirection): AddNodeDirection {
    if (direction === "child" && targetNode.type === "root") return "right";
    return targetNode.addNodeDirection ?? "right";
}
