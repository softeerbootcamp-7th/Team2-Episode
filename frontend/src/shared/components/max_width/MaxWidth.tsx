import { cva, VariantProps } from "class-variance-authority";
import { ComponentPropsWithoutRef } from "react";

import { cn } from "@/utils/cn";

type Props = ComponentPropsWithoutRef<"div"> & VariantProps<typeof variants>;

const MaxWidth = ({
    gap = "none",
    maxWidth = "md",
    direction = "y",
    align = "center",
    className,
    children,
    ...rest
}: Props) => {
    return (
        <div
            className={cn(
                "mx-auto flex-1 flex flex-col w-full",
                variants({ gap, maxWidth, direction, align }),
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    );
};

export default MaxWidth;

const variants = cva("flex px-4", {
    variants: {
        maxWidth: {
            sm: "max-w-sm",
            md: "max-w-2xl",
            lg: "max-w-7xl",
        },
        direction: {
            y: "flex-col",
            x: "flex-row",
        },
        align: {
            center: "items-center",
            left: "items-start",
            right: "items-end",
        },
        gap: {
            none: "",
            sm: "gap-4",
            md: "gap-8",
            lg: "gap-12.5",
        },
    },
});
