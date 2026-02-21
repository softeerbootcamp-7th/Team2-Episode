import { ComponentPropsWithoutRef, ReactNode } from "react";

import { useMindmapControllerContext } from "@/features/mindmap/core/MindmapProvider";
import Icon from "@/shared/components/icon/Icon";
import SquareButton from "@/shared/components/square_button/SquareButton";
import SquareButtonToolTip from "@/shared/components/square_button/SquareButtonToolTip";
import Tooltip from "@/shared/components/tooltip/Tooltip";
import { cn } from "@/utils/cn";

type ColProps = ComponentPropsWithoutRef<"li"> & {
    upSlot?: ReactNode;
    bottomSlot?: ReactNode;
};

function Col({ upSlot, bottomSlot, className, ...props }: ColProps) {
    return (
        <li className={cn("p-0 flex flex-col justify-between items-center gap-6", className)} {...props}>
            <div className="flex flex-col gap-2 items-center">{upSlot}</div>
            {bottomSlot}
        </li>
    );
}

const iconColor = "var(--color-gray-700)";

export default function ControllerSideBar() {
    const engine = useMindmapControllerContext();

    const handleReset = () => {
        engine.actions.resetViewport();
    };

    const handleFit = () => {
        engine.actions.fitToContent();
    };

    const handleNewNode = () => {
        engine.actions.startCreating();
    };

    return (
        <div className="absolute top-20 left-0 z-50 p-4">
            <Col
                upSlot={
                    <>
                        <Tooltip contents={<SquareButtonToolTip>화면 맞춤</SquareButtonToolTip>}>
                            <SquareButton onClick={handleFit}>
                                <Icon name="ic_tool_fit" color={iconColor} size="16" />
                            </SquareButton>
                        </Tooltip>

                        <Tooltip contents={<SquareButtonToolTip>중앙으로 이동</SquareButtonToolTip>}>
                            <SquareButton onClick={handleReset}>
                                <Icon name="ic_target" color={iconColor} size="16" />
                            </SquareButton>
                        </Tooltip>
                    </>
                }
                bottomSlot={
                    <Tooltip contents={<SquareButtonToolTip>노드 추가</SquareButtonToolTip>}>
                        <SquareButton onClick={handleNewNode}>
                            <Icon name="ic_plus" color={iconColor} size="16" />
                        </SquareButton>
                    </Tooltip>
                }
            />
        </div>
    );
}
