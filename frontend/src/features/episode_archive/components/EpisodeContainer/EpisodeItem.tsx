/** frontend/src/features/episode_archive/components/EpisodeContainer/EpisodeItem.tsx */
import { ReactNode } from "react";

type EpisodeItemProps = {
    children: ReactNode;
    highlightTerm?: string; // 검색어 추가
};

export default function EpisodeItem({ children, highlightTerm }: EpisodeItemProps) {
    // 텍스트 하이라이트 로직
    const renderContent = () => {
        if (!highlightTerm || typeof children !== "string") return children;

        const parts = children.split(new RegExp(`(${highlightTerm})`, "gi"));
        return parts.map((part, i) =>
            part.toLowerCase() === highlightTerm.toLowerCase() ? (
                <span key={i} className="text-primary font-semibold">
                    {part}
                </span>
            ) : (
                part
            ),
        );
    };

    return (
        <div className="flex items-start justify-start p-4 min-h-25 border-r border-gray-100 last:border-none">
            <div className="typo-body-14-reg-160 text-text-main2 text-left break-all text-pretty">
                {renderContent()}
            </div>
        </div>
    );
}
