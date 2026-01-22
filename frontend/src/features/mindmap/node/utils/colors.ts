import type { NodeComponentProps } from "@features/mindmap/node/types/node";

export const NODE_COLORS = ["violet", "blue", "skyblue", "mint", "cyan", "purple", "magenta", "navy"] as const;

export const getColorClass = ({ colorIndex = 0, color }: NodeComponentProps) => {
    // color 문자열이 있으면 우선 사용
    if (color) {
        return `bg-node-${color}-op-100`;
    }

    // colorIndex로 순환 처리
    const index = colorIndex % NODE_COLORS.length;
    return `bg-node-${NODE_COLORS[index]}-op-100`;
};
