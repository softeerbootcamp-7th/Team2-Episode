import { cn } from "@/utils/cn";

type EpisodeItemHeadProps = {
    startDate: string;
    endDate: string;
    episodeTitle: string;
    className: string;
};

/** 에피소드 아이템의 왼쪽 섹션으로, 배지, 활동 기간, 제목을 표시합니다. */
export default function EpisodeItemHead({ startDate, endDate, episodeTitle, className }: EpisodeItemHeadProps) {
    return (
        <div className={cn("flex flex-col w-50 gap-5 shrink-0 items-start justify-start", className)}>
            {/* 배지 (상단 정렬) */}

            <div className="flex flex-col gap-2 items-start">
                {/* 날짜 섹션: 가이드 주신 스타일 적용 */}
                <time className="text-text-placeholder typo-caption-12-reg leading-[140%] tracking-[-0.36px]">
                    {startDate} ~ {endDate}
                </time>

                {/* 제목 섹션: 좌상단 정렬을 위해 break-all 및 text-left 추가 */}
                <h3 className="text-text-main2 typo-title-20-semibold tracking-[-0.6px] break-all text-left">
                    {episodeTitle}
                </h3>
            </div>
        </div>
    );
}
