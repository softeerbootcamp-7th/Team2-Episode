import { cva } from "class-variance-authority";
import { ComponentPropsWithoutRef, ReactNode, useState } from "react";

import { useMindmapActions } from "@/features/mindmap/hooks/useMindmapStoreState";
import AddNode from "@/features/mindmap/node/components/add_node/AddNode";
import { NodeColor } from "@/features/mindmap/node/constants/colors";
import { NodeVariant } from "@/features/mindmap/node/types/node";
import { colorBySize } from "@/features/mindmap/node/utils/style";
import { NodeId } from "@/features/mindmap/types/node";
import Icon from "@/shared/components/icon/Icon";
import List from "@/shared/components/list/List";
import ListRow from "@/shared/components/list/ListRow";
import Popover from "@/shared/components/popover/Popover";
import { NonNullableVariantProps } from "@/shared/types/safe_variant_props";
import { cn } from "@/utils/cn";

type Props = ComponentPropsWithoutRef<"div"> & {
    children?: ReactNode;
};

export const nodeVariants = cva(
    "relative flex w-40 px-4.5 py-5 justify-center items-center gap-2.5 rounded-xl transition-shadow cursor-pointer outline-none",
    {
        variants: {
            size: {
                sm: "typo-body-14-medium text-text-main2",
                md: "typo-body-14-semibold text-text-main2",
                lg: "typo-body-16-semibold text-text-main1",
            },
        },
    },
);

function NodeComponent({ className, children, ...rest }: Props) {
    return (
        <div className={cn("group relative flex items-center gap-2", className)} {...rest}>
            {children}
        </div>
    );
}

const nodeMenuVariants = cva(
    "w-5.5 h-5.5 cursor-pointer rounded-bl-xl rounded-tr-lg justify-center items-center flex",
    {
        variants: {
            color: {
                violet: "bg-node-violet-op-100",
                blue: "bg-node-blue-op-100",
                skyblue: "bg-node-skyblue-op-100",
                mint: "bg-node-mint-op-100",
                cyan: "bg-node-cyan-op-100",
                purple: "bg-node-purple-op-100",
                magenta: "bg-node-magenta-op-100",
                navy: "bg-node-navy-op-100",
            },
        },
    },
);

type NodeContentProps = ComponentPropsWithoutRef<"div"> &
    NonNullableVariantProps<typeof nodeVariants> & {
        color: NodeColor;
        highlight?: boolean;
        children: ReactNode;
        nodeId: NodeId;
    };
function NodeContent({
    size = "sm",
    color,
    highlight = false,
    className,
    children,
    nodeId,
    ...rest
}: NodeContentProps) {
    const [isMenuOpened, setMenuIsOpened] = useState(false);
    const [isHover, setIsHover] = useState(false);

    const variant: NodeVariant = isHover || isMenuOpened ? "interactive" : highlight ? "highlighted" : "idle";

    const colorClass = colorBySize({ size, color, variant: variant });

    const { deleteNode } = useMindmapActions();

    const handleDelete = () => {
        deleteNode(nodeId);
    };

    return (
        <div
            className={cn(nodeVariants({ size }), colorClass, variant, className)}
            onPointerEnter={() => setIsHover(true)}
            onPointerLeave={() => setIsHover(false)}
            {...rest}
        >
            {children}
            {variant === "interactive" && (
                <button
                    className={cn(
                        nodeMenuVariants({ color }),
                        "absolute top-0 right-0 transition-opacity duration-300",
                    )}
                >
                    <Popover
                        isOnOpenChange={(v) => setMenuIsOpened(v)}
                        direction="bottom_right"
                        contents={
                            <List className="w-40">
                                <ListRow
                                    contents={"삭제하기"}
                                    className="text-red-300 typo-body-14-medium w-full text-left"
                                    leftSlot={<Icon name="ic_nodemenu_delete" size={16} />}
                                    onClick={handleDelete}
                                />
                            </List>
                        }
                    >
                        <Icon name="ic_ellipsis" size={16} color="var(--color-base-white)" />
                    </Popover>
                </button>
            )}
        </div>
    );
}
export const Node = Object.assign(NodeComponent, {
    AddNode: AddNode,
    Content: NodeContent,
});
