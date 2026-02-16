import { cva } from "class-variance-authority";
import { ReactNode, useRef, useState } from "react";

import useCalcSafeDirection from "@/shared/hooks/useCalcSafeDirection";
import useClickOutside from "@/shared/hooks/useClickOutside";
import { NonNullableVariantProps } from "@/shared/types/safe_variant_props";

type Props = NonNullableVariantProps<typeof variants> & {
    // uncontrolled
    children: ReactNode;
    contents: ReactNode;

    // controlled
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

const Popover = ({ direction = "bottom_left", children, contents, open, onOpenChange }: Props) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const contentsRef = useRef<HTMLDivElement>(null);

    const isControlled = open !== undefined;

    const [internalOpen, setInternalOpen] = useState(false);

    const visible = isControlled ? open : internalOpen;

    const setVisible = (next: boolean) => {
        if (!isControlled) {
            setInternalOpen(next);
        }
        onOpenChange?.(next);
    };

    useClickOutside(triggerRef, () => {
        if (visible) {
            setVisible(false);
        }
    });

    const { safeDirection } = useCalcSafeDirection({
        direction,
        triggerRef,
        contentsRef,
        disabled: !visible,
    });

    return (
        <div ref={triggerRef} className="relative w-fit">
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setVisible(!visible);
                }}
            >
                {children}
            </div>

            {visible && (
                <div ref={contentsRef} className={variants({ direction: safeDirection })}>
                    {contents}
                </div>
            )}
        </div>
    );
};

export default Popover;

const variants = cva("absolute z-50", {
    variants: {
        direction: {
            top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
            top_left: "bottom-full right-0 mb-2",
            top_right: "bottom-full left-0 mb-2",
            bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
            bottom_left: "top-full right-0 mt-2",
            bottom_right: "top-full left-0 mt-2",
            left: "right-full top-1/2 -translate-y-1/2 mr-2",
            left_top: "right-full bottom-0 mr-2",
            left_bottom: "right-full top-0 mr-2",
            right: "left-full top-1/2 -translate-y-1/2 ml-2",
            right_top: "left-full bottom-0 ml-2",
            right_bottom: "left-full top-0 ml-2",
        },
    },
});
