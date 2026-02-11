import { cva, VariantProps } from "class-variance-authority";
import { ComponentPropsWithoutRef } from "react";

import { cn } from "@/utils/cn";

export const TEMP_NODE_SIZE = {
    ghost: { width: 100, height: 42 },
} as const;

type TempNodeProps = ComponentPropsWithoutRef<"div"> & VariantProps<typeof tempNodeVariants>;

const tempNodeVariants = cva("", {
    variants: {
        type: {
            new: "flex w-40 min-w-40 px-4.5 py-5 justify-center items-center gap-2.5 typo-body-14-medium rounded-xl border-2 border-gray-500 bg-base-white shadow-[0_0_15px_0_rgba(43,46,67,0.15)]",
            ghost: `w-[${TEMP_NODE_SIZE.ghost.width}px] h-[${TEMP_NODE_SIZE.ghost.height}px] h-10.5 rounded-xl bg-node-blue-op-15`,
        },
    },
});

export default function TempNode({ type = "ghost", className, ...rest }: TempNodeProps) {
    const isGhost = type == "ghost";

    const content = isGhost ? null : "새로운 노드";

    return (
        <div {...rest} className={cn(tempNodeVariants({ type }), className)}>
            {content}
        </div>
    );
}
