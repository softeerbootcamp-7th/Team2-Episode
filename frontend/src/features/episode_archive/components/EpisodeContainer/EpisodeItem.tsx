import { ReactNode } from "react";

type EpisodeItemProps = {
    children: ReactNode;
};

/** * 에피소드의 각 STAR 항목 내용을 담는 최소 단위 컴포넌트입니다.
 * 너비는 부모 Grid에 의해 결정되며, 내용이 많아지면 세로로 늘어납니다.
 */
export default function EpisodeItem({ children }: EpisodeItemProps) {
    return (
        /* min-h-25 (100px) -> min-h-[6.25rem] */
        <div className="flex items-start justify-start p-4 min-h-[6.25rem] border-r border-gray-100 last:border-none">
            <div className="typo-body-14-reg-160 text-text-main2 text-left break-all text-pretty">{children}</div>
        </div>
    );
}
