/** frontend/src/features/episode_archive/components/episodeContainer/EpisodeItemColumn.tsx */
import { memo, useCallback, useState } from "react"; // 1. useState, useCallback 추가

import EpisodeItemHead from "@/features/episode_archive/components/EpisodeContainer/EpisodeItemHead";
import EpisodeStar from "@/features/episode_archive/components/EpisodeContainer/EpisodeStar";
import EpisodeEditBox from "@/features/episode_archive/components/episodeEdit/EpisodeEditBox"; // 2. EditBox 임포트 확인
import { EpisodeDetail, EpisodeDetailResponse } from "@/features/episode_archive/types/episode";

interface EpisodeItemColumnProps {
    summary: EpisodeDetail;
    searchTerm?: string;
}

const EpisodeItemColumn = memo(({ summary, searchTerm }: EpisodeItemColumnProps) => {
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const handleEditOpen = useCallback(() => setIsEditing(true), []);
    const handleEditClose = useCallback(() => setIsEditing(false), []);

    return (
        <div className="flex w-full gap-2 items-stretch border-b border-gray-100">
            {!isEditing && (
                <EpisodeItemHead
                    startDate={summary.startDate}
                    endDate={summary.endDate}
                    episodeTitle={summary.content}
                    className="w-48 shrink-0 py-5 px-2"
                />
            )}

            <div className="flex-1 bg-white">
                {isEditing ? (
                    <EpisodeEditBox initialData={summary as EpisodeDetailResponse} onCancel={handleEditClose} />
                ) : (
                    <EpisodeStar detail={summary} onEditClick={handleEditOpen} searchTerm={searchTerm} />
                )}
            </div>
        </div>
    );
});

EpisodeItemColumn.displayName = "EpisodeItemColumn";
export default EpisodeItemColumn;
