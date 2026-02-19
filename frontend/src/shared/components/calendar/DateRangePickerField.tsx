import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

import CustomCalendar from "@/shared/components/calendar/CustomCalendar";
import { cn } from "@/utils/cn";

export default function DateRangePickerField() {
    const [range, setRange] = useState<DateRange | undefined>();
    const [isOpen, setIsOpen] = useState(false);

    const formatDate = (date: Date) => format(date, "yyyy. MM. dd");

    return (
        <div className="relative flex flex-col gap-3 w-full">
            {/* Typography 시스템 적용 */}
            <label className="typo-body-14-semibold text-text-main1">진행 기간</label>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between w-full px-5 py-4 rounded-xl border border-gray-300 bg-white cursor-pointer",
                    isOpen && "border-primary",
                )}
            >
                <span
                    className={cn(
                        range?.from ? "typo-body-14-reg text-[#222]" : "typo-body-14-reg text-text-placeholder",
                    )}
                >
                    {range?.from ? (
                        <>
                            {formatDate(range.from)}
                            {range.to && ` ~ ${formatDate(range.to)}`}
                        </>
                    ) : (
                        "연도. 월. 일. ~ 연도. 월. 일."
                    )}
                </span>

                <CalendarIcon className="w-5 h-5 text-text-placeholder" />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50">
                    <CustomCalendar
                        selectedRange={range}
                        onSelect={(newRange) => {
                            setRange(newRange);
                            if (newRange?.from && newRange?.to) setIsOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
