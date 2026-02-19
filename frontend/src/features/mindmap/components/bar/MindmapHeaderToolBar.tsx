import { ComponentProps, ComponentPropsWithoutRef } from "react";

import Button from "@/shared/components/button/Button";
import Icon from "@/shared/components/icon/Icon";
import Popover from "@/shared/components/popover/Popover";
import Row from "@/shared/components/row/Row";
import Search from "@/shared/components/search/Search";
import { cn } from "@/utils/cn";

export type ActiveAction = "selfTest" | "star" | null;

type Props = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
    title: string;
    onBack?: () => void;

    onSearchChange?: ComponentProps<typeof Search>["onSearchChange"];
    onSearchSubmit?: ComponentProps<typeof Search>["onSearchSubmit"];

    /** controlled popover */
    isFilterOpen: boolean;
    onFilterOpenChange: (open: boolean) => void;

    /** 선택된 태그 존재 여부 */
    hasSelectedSkills: boolean;

    /** popover contents */
    filterPopover: React.ReactNode;

    activeAction: ActiveAction;
    onSelfTestClick: () => void;
    onStarOrganizeClick: () => void;
};

export default function MindmapHeaderToolBar({
    title,
    onBack,
    onSearchChange,
    onSearchSubmit,
    isFilterOpen,
    onFilterOpenChange,
    hasSelectedSkills,
    filterPopover,
    activeAction,
    onSelfTestClick,
    onStarOrganizeClick,
    className,
    ...rest
}: Props) {
    const handleBack = () => {
        if (onBack) return onBack();
        if (typeof window !== "undefined") window.history.back();
    };

    const isFilterActive = isFilterOpen || hasSelectedSkills;

    return (
        <header
            className={cn(
                "w-full flex flex-col items-start",
                "py-3 px-5",
                "border-b border-gray-200 bg-base-white",
                className,
            )}
            {...rest}
        >
            <Row
                leftSlot={
                    <button
                        type="button"
                        onClick={handleBack}
                        aria-label="뒤로가기"
                        className="-m-2 p-2 rounded-lg text-text-main1 hover:bg-gray-100 active:bg-gray-200"
                    >
                        <Icon name="ic_chevron_left" size={20} />
                    </button>
                }
                contents={
                    <div className="min-w-0 flex items-center gap-4">
                        <h1 className="typo-title-18-bold text-text-main1 whitespace-nowrap">{title}</h1>

                        <div
                            className="w-80"
                            onPointerDownCapture={() => onFilterOpenChange(false)}
                            onFocusCapture={() => onFilterOpenChange(false)}
                        >
                            <Search
                                placeholder="검색"
                                onSearchChange={onSearchChange}
                                onSearchSubmit={onSearchSubmit}
                            />
                        </div>

                        <Popover
                            isOpen={isFilterOpen}
                            isOnOpenChange={onFilterOpenChange}
                            direction="bottom_right"
                            contents={filterPopover}
                        >
                            <Button
                                type="button"
                                variant={isFilterActive ? "quaternary_accent_outlined" : "quaternary_outlined"}
                                size="sm"
                                borderRadius="2xl"
                                leftSlot={<Icon name="ic_filter" size={18} />}
                                rightSlot={
                                    <span
                                        className={cn(
                                            "transition-transform duration-200",
                                            isFilterOpen ? "rotate-180" : "rotate-0",
                                        )}
                                    >
                                        <Icon name="ic_dropdown" size={18} />
                                    </span>
                                }
                            >
                                역량 필터
                            </Button>
                        </Popover>
                    </div>
                }
                rightSlot={
                    <div className="shrink-0 flex items-center gap-2">
                        <Button
                            type="button"
                            variant={activeAction === "selfTest" ? "primary" : "ghost"}
                            size="sm"
                            borderRadius="2xl"
                            leftSlot={<Icon name="ic_circle_check" size={18} />}
                            onClick={() => {
                                onFilterOpenChange(false);
                                onSelfTestClick();
                            }}
                        >
                            기출문항 셀프진단
                        </Button>

                        <Button
                            type="button"
                            variant={activeAction === "star" ? "primary" : "ghost"}
                            size="sm"
                            borderRadius="2xl"
                            leftSlot={<Icon name="ic_star" size={18} />}
                            onClick={() => {
                                onFilterOpenChange(false);
                                onStarOrganizeClick();
                            }}
                        >
                            STAR 정리하기
                        </Button>
                    </div>
                }
            />
        </header>
    );
}
