import { memo } from "react";
import { UseFormRegisterReturn } from "react-hook-form";

import Icon from "@/shared/components/icon/Icon";

type DateInputProps = {
    placeholder?: string;
    value?: string;
    onClick?: () => void;
    registration: UseFormRegisterReturn;
};

const DateInput = memo(({ placeholder, value, onClick, registration }: DateInputProps) => {
    return (
        <div
            onClick={onClick}
            /* gap-2를 추가하여 텍스트와 아이콘 사이 간격 확보 */
            className="flex items-center justify-between w-full px-5 py-4 rounded-xl border border-gray-300 bg-white cursor-pointer focus-within:border-primary transition-colors gap-2"
        >
            <input
                {...registration}
                value={value || ""}
                placeholder={placeholder}
                readOnly
                /* min-w-0와 truncate를 추가하여 텍스트가 아이콘을 밀어내지 않게 함 */
                className="flex-1 min-w-0 typo-body-14-reg text-text-main1 outline-none border-none p-0 bg-transparent placeholder:text-text-placeholder cursor-pointer truncate"
            />
            {/* 아이콘이 사라지지 않도록 shrink-0 적용 */}
            <div className="flex items-center justify-center w-5 h-5 shrink-0">
                <Icon name="ic_calendar_days" size={20} color="var(-text-placeholder)" />
            </div>
        </div>
    );
});

DateInput.displayName = "DateInput";
export default DateInput;
