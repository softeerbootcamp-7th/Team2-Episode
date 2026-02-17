import { ComponentPropsWithoutRef, ReactNode } from "react";

import { useMindMapCore } from "@/features/mindmap/hooks/useMindmapContext";
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
    const core = useMindMapCore();

    const handleReset = () => {
        core?.resetViewport();
    };

    const handleFit = () => {
        core?.getBroker().publish("VIEWPORT_FIT_CONTENT", undefined);
    };

    const handleNewNode = () => {
        core?.getBroker().publish("PENDING_CREATION", undefined);
    };

    return (
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
    );
}
