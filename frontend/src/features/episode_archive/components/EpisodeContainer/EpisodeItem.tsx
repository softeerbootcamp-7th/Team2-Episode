import { ReactNode } from "react";

type Props = {
    children: ReactNode;
};

/** 에피소드의 각 STAR 항목 내용을 담는 최소 단위 컴포넌트입니다. 좌상단 정렬이 적용됩니다. */
export default function EpisodeItem({ children }: Props) {
    return (
        <div className="flex items-start justify-start p-4 min-h-25 border-gray-100 last:border-none">
            <div className="typo-body-14-reg-160 text-gray-800 text-left break-all text-pretty">{children}</div>
        </div>
    );
}
