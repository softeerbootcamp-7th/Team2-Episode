import useCalcSafeDirection from "@shared/hooks/useCalcSafeDirection";
import useToggle from "@shared/hooks/useToggle";
import { cva, VariantProps } from "class-variance-authority";
import { ReactNode, useRef } from "react";

export type BaseDirection = "top" | "bottom" | "left" | "right";
export type Direction =
    | "bottom_right"
    | "bottom_left"
    | "top_right"
    | "top_left"
    | "right_top"
    | "right_bottom"
    | "left_top"
    | "left_bottom"
    | BaseDirection;

type Props = VariantProps<typeof variants> & {
    children: ReactNode;
    contents: ReactNode;
};

const Popover = ({ primaryDirection = "bottom", secondaryDirection = "none", children, contents }: Props) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const contentsRef = useRef<HTMLDivElement>(null);

    const [isVisible, isVisibleHandler] = useToggle();
    const { safeDirection } = useCalcSafeDirection({
        primaryDirection,
        secondaryDirection: undefined,
        triggerRef,
        contentsRef,
        disabled: !isVisible,
    });

    return (
        <div ref={triggerRef} className="relative w-fit">
            <div onClick={isVisibleHandler.toggle}>{children}</div>

            {isVisible && (
                <div ref={contentsRef} className={variants({ ...safeDirection })}>
                    {contents}
                </div>
            )}
        </div>
    );
};

export default Popover;

const variants = cva("absolute z-50", {
    variants: {
        primaryDirection: {
            top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
            bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
            left: "right-full top-1/2 -translate-y-1/2 mr-2",
            right: "left-full top-1/2 -translate-y-1/2 ml-2",
        },
        secondaryDirection: {
            // Secondary가 있을 때 각 위치를 강제 고정
            top: "top-0 translate-y-0",
            bottom: "bottom-0 translate-y-0",
            left: "left-0 translate-x-0",
            right: "right-0 translate-x-0",
            // 값이 없을 때(null/undefined)를 위한 기본값은 아래 compound에서 처리
            none: "",
        },
    },
});

/**
 * 1. 클릭된다.
 * 2. 오버플로우히든인 래퍼를 찾는다.
 * 3. 디렉션에 따라 trigger, contents의 바운딩 박스가 래퍼를 벗어나는지 확인한다.
 * 4. 벗어난다면 해당 벗어난 위치에 mirror위치로 이동시켜 렌더링한다.
 */
