import "react-day-picker/dist/style.css";

import { ko } from "date-fns/locale";
import { memo } from "react";
import { DateRange, DayPicker } from "react-day-picker";

import { cn } from "@/utils/cn";

type CustomCalendarProps = {
    selectedRange: DateRange | undefined;
    onSelect: (range: DateRange | undefined) => void;
};

const CustomCalendar = memo(({ selectedRange, onSelect }: CustomCalendarProps) => {
    return (
        <div
            className={cn(
                "flex flex-col items-start p-4 bg-white rounded-xl",
                "w-fit h-fit",
                "shadow-[0_0_15px_0_rgba(43,46,67,0.15)]",
            )}
        >
            <DayPicker
                mode="range"
                locale={ko}
                selected={selectedRange}
                onSelect={onSelect}
                className="m-0"
                classNames={{
                    months: "flex flex-col",
                    month: "space-y-4",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    caption_label: "typo-body-14-semibold text-gray-800",
                    head_cell: "typo-caption-12-reg text-gray-400 w-9",
                    cell: "relative p-0 text-center typo-body-14-reg focus-within:relative focus-within:z-20",
                    day: cn(
                        "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md transition-colors",
                    ),
                    day_range_start: "day-range-start rounded-l-md bg-primary text-white",
                    day_range_end: "day-range-end rounded-r-md bg-primary text-white",
                    day_selected: "bg-primary text-white hover:bg-primary/90 focus:bg-primary",
                    day_today: "text-primary font-bold underline underline-offset-4",
                    day_outside: "text-gray-300 opacity-50",
                    day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary",
                }}
            />
        </div>
    );
});

CustomCalendar.displayName = "CustomCalendar";
export default CustomCalendar;
