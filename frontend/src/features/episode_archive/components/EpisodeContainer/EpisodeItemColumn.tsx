import { memo, useCallback, useState } from "react";

import EpisodeItemHead from "@/features/episode_archive/components/episodeContainer/EpisodeItemHead";
import EpisodeStar from "@/features/episode_archive/components/episodeContainer/EpisodeStar";
import EpisodeEditBox from "@/features/episode_archive/components/episodeEdit/EpisodeEditBox";
import { useLazyDetail } from "@/features/episode_archive/hooks/useLazyDetail";
import { EpisodeDetailResponse, EpisodeSummary } from "@/features/episode_archive/types/episode";

interface EpisodeItemColumnProps {
    summary: EpisodeSummary;
}

// EpisodeItemColumn.tsx
const EpisodeItemColumn = memo(({ summary }: EpisodeItemColumnProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const { detail, setDetail, ref: observerRef } = useLazyDetail(summary.nodeId, null);

    const handleStartEdit = useCallback(() => {
        console.log("✅ [Column] handleStartEdit 호출됨. 현재 ID:", summary.nodeId);
        setIsEditing(true);
    }, [summary.nodeId]);

    const handleSave = useCallback(
        (updatedData: EpisodeDetailResponse) => {
            setDetail(updatedData);
            setIsEditing(false);
        },
        [setDetail],
    );

    if (isEditing) {
        const initialData: EpisodeDetailResponse = detail ?? {
            ...summary,
            situation: "",
            task: "",
            action: "",
            result: "",
            competencyTypes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        return (
            <div className="py-4 border-b border-gray-100">
                <EpisodeEditBox initialData={initialData} onSave={handleSave} onCancel={() => setIsEditing(false)} />
            </div>
        );
    }

    return (
        <div ref={observerRef} className="flex w-full gap-2 items-stretch border-b border-gray-100">
            <EpisodeItemHead
                startDate={detail?.startDate || summary.startDate}
                endDate={detail?.endDate || summary.endDate}
                episodeTitle={detail?.content || summary.content}
                className="w-48 shrink-0 py-10"
            />
            <div className="flex-1 bg-white">
                {detail ? (
                    <EpisodeStar detail={detail} onEditClick={() => handleStartEdit()} />
                ) : (
                    /* 데이터가 없을 때 표시될 기본 placeholder 뷰 */
                    <div
                        onClick={() => {
                            setIsEditing(true);
                        }}
                        className="flex w-full h-full min-h-40 items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-text-placeholder typo-body-14-reg">작성된 상세 내용이 없습니다.</span>
                            <span className="text-cobalt-500 typo-body-14-semibold underline">
                                클릭해서 STAR 작성하기
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

EpisodeItemColumn.displayName = "EpisodeItemColumn";
export default EpisodeItemColumn;
