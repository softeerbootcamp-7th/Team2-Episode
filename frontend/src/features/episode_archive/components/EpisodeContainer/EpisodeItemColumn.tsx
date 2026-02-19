import { memo } from "react";

import EpisodeItemHead from "@/features/episode_archive/components/episodeContainer/EpisodeItemHead";
import EpisodeStar from "@/features/episode_archive/components/episodeContainer/EpisodeStar";
import { EpisodeDetail } from "@/features/episode_archive/types/episode";

interface EpisodeItemColumnProps {
    summary: EpisodeDetail;
}

const EpisodeItemColumn = memo(({ summary }: EpisodeItemColumnProps) => {
    return (
        <div className="flex w-full gap-2 items-stretch border-b border-gray-100">
            {/* 왼쪽 헤더 섹션 */}
            <EpisodeItemHead
                startDate={summary.startDate}
                endDate={summary.endDate}
                episodeTitle={summary.content}
                className="w-48 shrink-0 py-5 px-2"
            />

            <div className="flex-1 bg-white">
                <EpisodeStar detail={summary} onEditClick={() => {}} />
            </div>
        </div>
    );
});

EpisodeItemColumn.displayName = "EpisodeItemColumn";
export default EpisodeItemColumn;
