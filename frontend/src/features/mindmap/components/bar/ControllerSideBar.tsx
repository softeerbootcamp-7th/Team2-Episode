import { ComponentPropsWithoutRef, ReactNode } from "react";

import { useMindmapControllerContext } from "@/features/mindmap/core/MindmapProvider";
import Button from "@/shared/components/button/Button";
import Icon from "@/shared/components/icon/Icon";
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
                        <Button variant="sidebar" borderRadius="xl" size="xs" onClick={handleFit}>
                            <Icon name="ic_tool_fit" color={iconColor} />
                        </Button>

                        <Button variant="sidebar" borderRadius="xl" size="xs" onClick={handleReset}>
                            <Icon name="ic_target" color={iconColor} />
                        </Button>
                    </>
                }
                bottomSlot={
                    <Button variant="sidebar" borderRadius="xl" size="xs" onClick={handleNewNode}>
                        <Icon name="ic_plus" color={iconColor} />
                    </Button>
                }
            />
        </div>
    );
}
