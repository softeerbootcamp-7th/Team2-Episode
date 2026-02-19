import { format, parseISO } from "date-fns";
import { useCallback, useState } from "react";
import { DateRange } from "react-day-picker";
import { useFormContext } from "react-hook-form";

import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import CustomCalendar from "@/shared/components/calendar/CustomCalendar";
import DateInput from "@/shared/components/calendar/DateInput";
import Popover from "@/shared/components/popover/Popover";
import { cn } from "@/utils/cn";

export default function EpisodeInfoSection({ className }: { className?: string }) {
    const { register, watch, setValue } = useFormContext<EpisodeDetailResponse>();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const startDate = watch("startDate");
    const endDate = watch("endDate");

    const getDisplayDate = (dateStr?: string) => {
        if (!dateStr) return "";
        try {
            return format(parseISO(dateStr), "yyyy. MM. dd");
        } catch {
            return dateStr;
        }
    };

    const handleOpen = useCallback(() => setIsCalendarOpen(true), []);

    const handleSelect = useCallback(
        (range: DateRange | undefined) => {
            setValue("startDate", range?.from?.toISOString() || "");
            setValue("endDate", range?.to?.toISOString() || "");
            if (range?.from && range?.to) {
                setIsCalendarOpen(false);
            }
        },
        [setValue],
    );

    return (
        <div className={cn("flex flex-col gap-8", className)}>
            <div className="flex flex-col gap-3 w-full">
                <label className="typo-body-14-semibold text-text-main1">진행 기간</label>

                {/* ✅ Phase 1: Popover를 상단으로 이동 - 두 DateInput을 모두 포함 */}
                <Popover
                    isOpen={isCalendarOpen}
                    isOnOpenChange={setIsCalendarOpen}
                    direction="bottom_right"
                    contents={
                        <div className="flex justify-center items-center">
                            <CustomCalendar
                                selectedRange={{
                                    from: startDate ? parseISO(startDate) : undefined,
                                    to: endDate ? parseISO(endDate) : undefined,
                                }}
                                onSelect={handleSelect}
                            />
                        </div>
                    }
                >
                    <div className="flex flex-col items-center gap-2 w-full">
                        {/* 상단 입력창 */}
                        <DateInput
                            registration={register("startDate")}
                            value={getDisplayDate(startDate)}
                            placeholder="연도. 월. 일."
                            onClick={handleOpen}
                        />

                        <span className="typo-body-14-reg text-text-placeholder">~</span>

                        {/* 하단 입력창 */}
                        <DateInput
                            registration={register("endDate")}
                            value={getDisplayDate(endDate)}
                            placeholder="연도. 월. 일."
                            onClick={handleOpen}
                        />
                    </div>
                </Popover>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <label className="typo-body-14-semibold text-text-main1">에피소드</label>
                <div className="flex w-full min-h-30 px-5 pt-4 pb-3.5 rounded-xl border border-gray-300 bg-white focus-within:border-primary transition-colors">
                    <textarea
                        {...register("content")}
                        placeholder="에피소드 제목을 입력하세요"
                        className="w-full typo-body-14-reg text-text-main1 outline-none border-none resize-none p-0 bg-transparent placeholder:text-text-placeholder"
                    />
                </div>
            </div>
        </div>
    );
}
