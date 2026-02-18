import { useEffect, useRef, useState } from "react";

import EpisodeItemHead from "@/features/episode_archive/components/episodeContainer/EpisodeItemHead";
import EpisodeStar from "@/features/episode_archive/components/episodeContainer/EpisodeStar";
import { MOCK_EPISODE_DETAILS } from "@/features/episode_archive/data";
import { EpisodeDetailResponse, EpisodeSummary } from "@/features/episode_archive/types/episode";

// Props 인터페이스를 명확히 정의하여 MindmapEpisodeContainer와의 타입 에러를 해결합니다.
interface EpisodeItemColumnProps {
    summary: EpisodeSummary;
}

export default function EpisodeItemColumn({ summary }: EpisodeItemColumnProps) {
    const [detail, setDetail] = useState<EpisodeDetailResponse | null>(null);
    const observerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting) {
                    const data = MOCK_EPISODE_DETAILS[summary.nodeId] ?? null;
                    setDetail(data);
                    observer.disconnect();
                }
            },
            { rootMargin: "300px" },
        );

        if (observerRef.current) observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [summary.nodeId]);

    return (
        <div
            ref={observerRef}
            // EpisodeBar와 동일한 간격(gap-2) 및 하단 구분선 적용
            className="flex w-full gap-2 items-stretch border-b border-gray-100"
        >
            {/* 1. EPISODE 영역 (Bar의 w-48과 일치하도록 w-48 적용) */}
            <EpisodeItemHead
                startDate={summary.startDate}
                endDate={summary.endDate}
                episodeTitle={summary.content}
                className="w-48 shrink-0 py-10"
            />

            {/* 2. STAR + 역량 영역 (Bar의 flex-1 영역) */}
            <div className="flex-1 bg-white">
                {detail ? (
                    <EpisodeStar detail={detail} />
                ) : (
                    <div className="w-full h-40 flex items-center justify-center text-text-placeholder typo-body-14-reg">
                        내용을 불러오는 중입니다...
                    </div>
                )}
            </div>
        </div>
    );
}
