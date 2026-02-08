import { NodeElement } from "@/features/mindmap/types/mindmapType";
import { Rect } from "@/features/quad_tree/types/rect";

/**
 * 노드가 화면 밖이거나 구석일 때, 전체가 다 보이도록 뷰포트를 밀어넣는 최소 이동량을 계산
 */
export const calculateFocusOffset = (viewBox: Rect, node: NodeElement, paddingRatio: number = 0.1) => {
    const viewW = viewBox.maxX - viewBox.minX;
    const viewH = viewBox.maxY - viewBox.minY;
    const padX = viewW * paddingRatio;
    const padY = viewH * paddingRatio;

    const nodeLeft = node.x - node.width / 2;
    const nodeRight = node.x + node.width / 2;
    const nodeTop = node.y - node.height / 2;
    const nodeBottom = node.y + node.height / 2;

    let diffX = 0;
    let diffY = 0;

    // X축: 거대 노드는 중앙 정렬, 일반 노드는 이탈한 만큼만 이동
    if (node.width > viewW - padX * 2) {
        diffX = node.x - (viewBox.minX + viewBox.maxX) / 2;
    } else if (nodeLeft < viewBox.minX + padX) {
        diffX = nodeLeft - (viewBox.minX + padX);
    } else if (nodeRight > viewBox.maxX - padX) {
        diffX = nodeRight - (viewBox.maxX - padX);
    }

    // Y축: 거대 노드는 중앙 정렬, 일반 노드는 이탈한 만큼만 이동
    if (node.height > viewH - padY * 2) {
        diffY = node.y - (viewBox.minY + viewBox.maxY) / 2;
    } else if (nodeTop < viewBox.minY + padY) {
        diffY = nodeTop - (viewBox.minY + padY);
    } else if (nodeBottom > viewBox.maxY - padY) {
        diffY = nodeBottom - (viewBox.maxY - padY);
    }

    return { diffX, diffY };
};
