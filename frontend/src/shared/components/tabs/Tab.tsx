import { cva, type VariantProps } from "class-variance-authority";
import { Children, cloneElement, ComponentProps, ReactElement } from "react";

import TabItem from "@/shared/components/tabs/TabItem";
import { cn } from "@/utils/cn";

const tabVariants = cva("flex border-b-2 border-gray-200 h-12.5", {
    variants: {
        layout: {
            fit: "w-fit",
            fullWidth: "w-full",
        },
    },
});

type Props<T extends string | number> = VariantProps<typeof tabVariants> & {
    children: ReactElement<ComponentProps<typeof TabItem>>[];
    onChange: (id: T) => void;
    selectedTabId: T;
    className?: string;
};

const TabComponent = <T extends string | number>({
    children,
    onChange,
    selectedTabId,
    layout = "fullWidth",
    className,
}: Props<T>) => {
    return (
        <div className={cn(tabVariants({ layout }), className)}>
            {Children.map(children, (child) => {
                if (!child) return null;

                return cloneElement(child, {
                    onClick: () => onChange(child.props.id as T),
                    isSelected: child.props.id === selectedTabId,
                });
            })}
        </div>
    );
};

const Tab = Object.assign(TabComponent, {
    Item: TabItem,
});

export default Tab;
