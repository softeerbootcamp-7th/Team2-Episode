import { format, parseISO } from "date-fns";
import { useCallback, useState } from "react";
import { DateRange } from "react-day-picker";
import { useFormContext } from "react-hook-form";

import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import CustomCalendar from "@/shared/components/calendar/CustomCalendar";
import DateInput from "@/shared/components/calendar/DateInput";
import Popover from "@/shared/components/popover/Popover";
import { cn } from "@/utils/cn";

type EpisodeInfoSectionProps = {
    className?: string;
};

export default function EpisodeInfoSection({ className }: EpisodeInfoSectionProps) {
    const { register, watch, setValue } = useFormContext<EpisodeDetailResponse>();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const startDate = watch("startDate");
    const endDate = watch("endDate");

    const getDisplayDate = useCallback((dateStr?: string) => {
        if (!dateStr || dateStr === "0000-00-00") return "";
        try {
            return format(parseISO(dateStr), "yyyy. MM. dd");
        } catch {
            return dateStr;
        }
    }, []);

    const handleSelect = useCallback(
        (range: DateRange | undefined) => {
            const formattedStart = range?.from ? format(range.from, "yyyy-MM-dd") : "0000-00-00";
            const formattedEnd = range?.to ? format(range.to, "yyyy-MM-dd") : "0000-00-00";

            setValue("startDate", formattedStart, { shouldDirty: true });
            setValue("endDate", formattedEnd, { shouldDirty: true });
        },
        [setValue],
    );

    return (
        <div className={cn("flex flex-col gap-8 overflow-visible", className)}>
            <div className="flex flex-col gap-3 w-full overflow-visible">
                <label className="typo-body-14-semibold text-text-main1">진행 기간</label>
                <Popover
                    isOpen={isCalendarOpen}
                    isOnOpenChange={setIsCalendarOpen}
                    direction="bottom_right"
                    wrapperClassName="w-full"
                    contents={
                        <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                            <CustomCalendar
                                selectedRange={{
                                    from: startDate && startDate !== "0000-00-00" ? parseISO(startDate) : undefined,
                                    to: endDate && endDate !== "0000-00-00" ? parseISO(endDate) : undefined,
                                }}
                                onSelect={handleSelect}
                            />
                        </div>
                    }
                >
                    <div className="flex flex-col items-center gap-2 w-full">
                        <DateInput
                            registration={register("startDate")}
                            value={getDisplayDate(startDate)}
                            placeholder="연도. 월. 일."
                            onClick={() => setIsCalendarOpen(true)}
                        />
                        <span className="typo-body-14-reg text-text-placeholder">~</span>
                        <DateInput
                            registration={register("endDate")}
                            value={getDisplayDate(endDate)}
                            placeholder="연도. 월. 일."
                            onClick={() => setIsCalendarOpen(true)}
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
