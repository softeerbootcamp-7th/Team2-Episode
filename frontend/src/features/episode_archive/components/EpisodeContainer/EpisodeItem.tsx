import { ReactNode } from "react";

type EpisodeItemProps = {
    children: ReactNode;
};

export default function EpisodeItem({ children }: EpisodeItemProps) {
    return (
        <div className="flex items-start justify-start p-4 min-h-[6.25rem] border-r border-gray-100 last:border-none">
            <div className="typo-body-14-reg-160 text-text-main2 text-left break-all text-pretty">{children}</div>
        </div>
    );
}
