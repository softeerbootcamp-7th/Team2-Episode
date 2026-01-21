import { cn } from "@utils/cn";

const NODE_COLORS = ["violet", "blue", "skyblue", "mint", "cyan", "purple", "magenta", "navy"] as const;

const getColorClass = (colorIndex: number) => {
    const index = colorIndex % NODE_COLORS.length;
    return `bg-node-${NODE_COLORS[index]}-op-100`;
};

type AddNodeButtonProps = {
    colorIndex?: number;
    className?: string;
};

const AddNodeButton = ({ colorIndex = 0, className }: AddNodeButtonProps) => {
    return <button className={cn("w-3 h-3 rounded-full cursor-pointer", getColorClass(colorIndex), className)} />;
};

export default AddNodeButton;
