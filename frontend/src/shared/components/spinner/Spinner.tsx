import { ReactNode } from "react";

import { cn } from "@/utils/cn"; // 기존에 사용하시던 cn 유틸 활용

type Props = {
    contents?: ReactNode;
    fullPage?: boolean;
};

const Spinner = ({ contents = "데이터를 불러오는 중...", fullPage = true }: Props) => {
    return (
        <div className={cn("flex flex-col items-center justify-center w-full gap-4", fullPage ? "h-screen" : "h-full")}>
            <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-primary animate-spin"></div>
            </div>
            <span className="text-gray-600 font-medium">{contents}</span>
        </div>
    );
};

export default Spinner;
