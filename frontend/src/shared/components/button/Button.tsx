import { cva, type VariantProps } from "class-variance-authority";
import { ComponentPropsWithRef, ReactNode } from "react";

import { COLOR_SET } from "@/shared/styles/color_set";
import { cn } from "@/utils/cn";

type Props = ComponentPropsWithRef<"button"> &
    VariantProps<typeof buttonVariants> & {
        leftSlot?: ReactNode;
        rightSlot?: ReactNode;
    };

const Button = ({
    variant = "primary",
    size = "md",
    align = "center",
    layout = "fit",
    borderRadius = "2xl",
    leftSlot,
    rightSlot,
    children,
    className,
    ref,
    ...rest
}: Props) => {
    return (
        <button
            ref={ref}
            className={cn(buttonVariants({ variant, size, align, layout, borderRadius }), className)}
            {...rest}
        >
            {leftSlot}

            <span className="flex-1">{children}</span>

            {rightSlot}
        </button>
    );
};

export default Button;
const buttonVariants = cva(
    "flex flex-row gap-2 items-center justify-center whitespace-nowrap transition-all duration-200 ease-in-out active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
    {
        variants: {
            variant: {
                primary_accent: COLOR_SET.primary_accent,
                primary: COLOR_SET.primary,
                secondary: COLOR_SET.secondary,
                tertiary: COLOR_SET.tertiary,
                tertiary_outlined: COLOR_SET.tertiary_outlined,
                quaternary: COLOR_SET.quaternary,
                quaternary_outlined: COLOR_SET.quaternary_outlined,
                quaternary_accent_outlined: COLOR_SET.quaternary_accent_outlined,
                basic: COLOR_SET.basic,
                basic_accent: COLOR_SET.basic_accent,
                alert: COLOR_SET.alert,
                ghost: "text-text-main2 bg-transparent hover:bg-gray-100 active:bg-gray-200",
                sidebar:
                    "bg-white border border-base-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.10)] hover:bg-gray-50",
            },
            size: {
                xs: "typo-body-14-medium py-2 px-3",
                sm: "typo-body-14-medium py-3 px-4 min-w-20",
                md: "typo-body-16-semibold py-4 px-5",
                lg: "typo-body-16-medium py-5 px-10",
            },
            borderRadius: {
                none: "rounded-none",
                sm: "rounded-sm",
                md: "rounded-md",
                lg: "rounded-lg",
                xl: "rounded-xl",
                "2xl": "rounded-2xl",
                full: "rounded-full",
            },
            align: {
                left: "justify-start text-left",
                center: "justify-center text-center",
                right: "justify-end text-right",
            },
            layout: {
                fit: "w-fit",
                fullWidth: "w-full",
            },
        },
    },
);
