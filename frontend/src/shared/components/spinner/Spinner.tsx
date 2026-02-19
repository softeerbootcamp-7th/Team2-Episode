import { ReactNode } from "react";

type Props = {
    contents?: ReactNode;
};

const Spinner = ({ contents = "데이터를 불러오는 중..." }: Props) => {
    return (
        <div className="flex flex-col h-full w-full items-center justify-center min-h-50 gap-10">
            <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-primary animate-spin"></div>
            </div>

            {contents}
        </div>
    );
};

export default Spinner;
