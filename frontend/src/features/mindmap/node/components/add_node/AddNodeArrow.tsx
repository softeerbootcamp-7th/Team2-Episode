import { cva, VariantProps } from "class-variance-authority";
import { ComponentPropsWithoutRef } from "react";

import { COLOR_CLASS_MAP, NodeColor } from "@/features/mindmap/node/constants/colors";
import { cn } from "@/utils/cn";
import Icon from "@/shared/components/icon/Icon";

type Props = Omit<ComponentPropsWithoutRef<"button">, "color"> &
    VariantProps<typeof DirectionProps> & {
        color: NodeColor;
    };

const DirectionProps = cva("w-5 h-6 text-base-white", {
    variants: {
        direction: {
            left: "rotate-310",
            right: "rotate-135",
        },
    },
});

export default function AddNodeArrow({ color, direction, className }: Props) {
    const handleAddNode = () => {
        // TODO: menu 컴포넌트 생성
    };

    const centerClass = "flex items-center justify-center rounded-full";

    const outerCircleClass = cn("w-13.5 h-13.5 cursor-pointer", centerClass, COLOR_CLASS_MAP.bg[color][15]);
    const iconCircleClass = cn("w-11 h-11 border-base-white border-3", centerClass, COLOR_CLASS_MAP.bg[color][100]);

    return (
        <button onClick={handleAddNode} className={outerCircleClass}>
            <div className={iconCircleClass}>
                <Icon name="ic_tool_move" color="var(--color-base-white)" fill="var(--color-base-white)" size={17} rotate={direction == "left" ? 310 : 135}/>
                {/* <IcIconMove className={cn(DirectionProps({ direction }), className)} /> */}
            </div>
        </button>
    );
}
