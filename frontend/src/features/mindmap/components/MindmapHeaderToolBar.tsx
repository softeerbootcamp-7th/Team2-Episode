import { ComponentProps, ComponentPropsWithoutRef, ReactNode } from "react";

import Button from "@/shared/components/button/Button";
import Icon from "@/shared/components/icon/Icon";
import Search from "@/shared/components/search/Search";
import { cn } from "@/utils/cn";

export type ActiveAction = "selfTest" | "star" | null;

type TopProps = {
    leftSlot?: ReactNode;
    contents?: ReactNode;
    rightSlot?: ReactNode;
    className?: string;
};

// TODO
/**
 * Row 컴포넌트처럼 left/contents/right slot을 제공하는 헤더 전용 래퍼.
 * (Row는 li 기반이라 Header에서는 div 기반으로 재구성)
 */
function Top({ leftSlot, contents, rightSlot, className }: TopProps) {
    return (
        <div className={cn("w-full flex flex-row items-center justify-between gap-4", className)}>
            <div className="min-w-0 flex flex-row items-center gap-3">
                {leftSlot}
                {contents}
            </div>
            {rightSlot}
        </div>
    );
}

type Props = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
    title: string;
    onBack?: () => void;

    // 검색창 클릭 시 필터를 닫기 위한 핸들러
    onSearchFocus?: () => void;
    onSearchChange?: ComponentProps<typeof Search>["onSearchChange"];
    onSearchSubmit?: ComponentProps<typeof Search>["onSearchSubmit"];
    searchPlaceholder?: string;

    /** 역량 필터 상태 및 핸들러 */
    isFilterOpen?: boolean;
    onFilterClick?: () => void;

    /** 우측 버튼 액션 상태 및 핸들러 */
    activeAction?: ActiveAction; // 외부에서 주입받는 현재 활성 액션
    onSelfTestClick?: () => void;
    onStarOrganizeClick?: () => void;
};

export default function MindmapHeaderToolBar({
    title,
    onBack,
    onSearchFocus,
    onSearchChange,
    onSearchSubmit,
    searchPlaceholder = "검색",
    isFilterOpen = false,
    onFilterClick,
    activeAction = null,
    onSelfTestClick,
    onStarOrganizeClick,
    className,
    ...rest
}: Props) {
    const handleBack = () => {
        if (onBack) {
            onBack();
            return;
        }
        if (typeof window !== "undefined") window.history.back();
    };

    return (
        <header
            className={cn(
                "w-full h-full flex flex-col items-start px-10 py-3",
                "border-b border-gray-200 bg-base-white",
                className,
            )}
            {...rest}
        >
            <Top
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
                    <div className="min-w-0 flex flex-row items-center gap-4">
                        <h1 className="typo-title-18-bold text-text-main1 whitespace-nowrap">{title}</h1>

                        <div className="w-80" onFocus={onSearchFocus}>
                            <Search
                                placeholder={searchPlaceholder}
                                onSearchChange={onSearchChange}
                                onSearchSubmit={onSearchSubmit}
                            />
                        </div>

                        <Button
                            type="button"
                            // 필터 오픈 여부에 따라 variant 변경
                            variant={isFilterOpen ? "tertiary_outlined" : "quaternary_accent_outlined"}
                            size="sm"
                            borderRadius="2xl"
                            leftSlot={<Icon name="ic_filter" size={18} />}
                            rightSlot={<Icon name="ic_up" size={18} rotate={isFilterOpen ? 0 : 180} />}
                            onClick={onFilterClick}
                            className={cn("border", isFilterOpen ? "border-primary-500" : "border-gray-300")}
                        >
                            역량 필터
                        </Button>
                    </div>
                }
                rightSlot={
                    <div className="shrink-0 flex flex-row items-center gap-2">
                        <Button
                            type="button"
                            variant={activeAction === "selfTest" ? "primary" : "ghost"}
                            size="sm"
                            borderRadius="2xl"
                            leftSlot={<Icon name="ic_selftest" size={18} />}
                            onClick={onSelfTestClick}
                        >
                            기출문항 셀프진단
                        </Button>

                        <Button
                            type="button"
                            variant={activeAction === "star" ? "primary" : "ghost"}
                            size="sm"
                            borderRadius="2xl"
                            leftSlot={<Icon name="ic_writing" size={18} />}
                            onClick={onStarOrganizeClick}
                        >
                            STAR 정리하기
                        </Button>
                    </div>
                }
            />
        </header>
    );
}
