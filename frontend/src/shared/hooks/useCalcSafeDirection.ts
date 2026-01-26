import { BaseDirection, Direction } from "@shared/components/popover/Popover";
import findParentDOMByClass from "@utils/findParentDOMByClass";
import { RefObject, useLayoutEffect, useState } from "react";

type Props = {
    triggerRef: RefObject<HTMLDivElement | null>;
    contentsRef: RefObject<HTMLDivElement | null>;
    disabled?: boolean;
    primaryDirection: BaseDirection;
    secondaryDirection?: BaseDirection;
};

const OPPOSITE: Record<BaseDirection, BaseDirection> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
};

type SafeDirection = {
    primaryDirection: BaseDirection;
    secondaryDirection?: BaseDirection;
};

const useCalcSafeDirection = ({
    disabled = false,
    primaryDirection,
    secondaryDirection,
    triggerRef,
    contentsRef,
}: Props) => {
    const [safeDirection, setSafeDirection] = useState<SafeDirection>({
        primaryDirection,
        secondaryDirection,
    });

    useLayoutEffect(() => {
        if (disabled || !contentsRef?.current || !triggerRef?.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const contentsRect = contentsRef.current.getBoundingClientRect();
        const parentRect = getParentRect({ triggerRef });

        const space = calcRemainingSpace({ parentRect, triggerRect });

        // 1. Primary 결정 (축 반전)
        let nextPrimary = primaryDirection;
        const isPrimaryVertical = primaryDirection === "top" || primaryDirection === "bottom";
        const primarySize = isPrimaryVertical ? contentsRect.height : contentsRect.width;

        if (space[primaryDirection] < primarySize && space[OPPOSITE[primaryDirection]] > space[primaryDirection]) {
            nextPrimary = OPPOSITE[primaryDirection];
        }

        // 2. Secondary 결정
        let nextSecondary = secondaryDirection;
        if (secondaryDirection) {
            const isSecondaryVertical = secondaryDirection === "top" || secondaryDirection === "bottom";
            const secondarySize = isSecondaryVertical ? contentsRect.height : contentsRect.width;

            // Secondary 방향으로 공간이 부족하면 반전
            if (
                space[secondaryDirection] < secondarySize &&
                space[OPPOSITE[secondaryDirection]] > space[secondaryDirection]
            ) {
                nextSecondary = OPPOSITE[secondaryDirection];
            }
        }

        setSafeDirection({
            primaryDirection: nextPrimary,
            secondaryDirection: nextSecondary,
        });
    }, [disabled, primaryDirection, secondaryDirection]);

    return { safeDirection };
};
export default useCalcSafeDirection;

function calcRemainingSpace({ parentRect, triggerRect }: { parentRect: DOMRect; triggerRect: DOMRect }) {
    const remainingSpace = {
        top: triggerRect.top - parentRect.top,
        bottom: parentRect.bottom - triggerRect.bottom,
        left: triggerRect.left - parentRect.left,
        right: parentRect.right - triggerRect.right,
    };

    return remainingSpace;
}

type CardinalDirections = {
    top: number;
    left: number;
    bottom: number;
    right: number;
};

function needReverseTo({
    to,
    contentsRect,
    remainingSpace,
}: {
    to: "top" | "left" | "bottom" | "right";
    contentsRect: DOMRect;
    remainingSpace: CardinalDirections;
}) {
    switch (to) {
        case "top":
            if (remainingSpace.top > contentsRect.height && remainingSpace.bottom < contentsRect.height) {
                return true;
            }

            return false;

        case "bottom":
            if (remainingSpace.bottom > contentsRect.height && remainingSpace.top < contentsRect.height) {
                return true;
            }

            return false;

        case "left":
            if (remainingSpace.left > contentsRect.width && remainingSpace.right < contentsRect.width) {
                return true;
            }

            return false;

        case "right":
            if (remainingSpace.right > contentsRect.width && remainingSpace.left < contentsRect.width) {
                return true;
            }

            return false;

        default:
            return false;
    }
}

function isBaseDirection(direction: Direction): direction is BaseDirection {
    if (!direction.includes("_")) {
        return true;
    }

    return false;
}

function getParentRect({ triggerRef }: { triggerRef: RefObject<HTMLDivElement> }) {
    const parent =
        findParentDOMByClass({
            startDOM: triggerRef.current,
            className: "overflow-hidden",
        }) || document.documentElement;
    const parentRect = parent.getBoundingClientRect();

    return parentRect;
}
