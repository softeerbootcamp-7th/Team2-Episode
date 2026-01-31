import { ComponentPropsWithoutRef } from "react";

import { cn } from "@/utils/cn";
import { NodeColor } from "@/features/mindmap/node/constants/colors";
import AddNodeDot from "@/features/mindmap/node/components/add_node/AddNodeDot";
import AddNodeArrow from "@/features/mindmap/node/components/add_node/AddNodeArrow";

type Props = ComponentPropsWithoutRef<"div"> & {
        color : NodeColor
        direction: "left" | "right";
    };

export default function AddNode({ color, direction, className, ...rest }: Props) {
    return (
        <div {...rest} className={cn("group relative w-13.5 h-13.5 flex items-center justify-center", className)}>
            <div className="transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                <AddNodeDot color={color} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 hover:opacity-100 opacity-0">
                <AddNodeArrow color={color} direction={direction} />
            </div>
        </div>
    );
}
