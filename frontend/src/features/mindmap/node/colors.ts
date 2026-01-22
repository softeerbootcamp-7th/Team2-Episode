const NODE_COLORS = ["violet", "blue", "skyblue", "mint", "cyan", "purple", "magenta", "navy"] as const;

export const getColorClass = (colorIndex: number) => {
    const index = colorIndex % NODE_COLORS.length;

    return `bg-node-${NODE_COLORS[index]}-op-100`;
};
