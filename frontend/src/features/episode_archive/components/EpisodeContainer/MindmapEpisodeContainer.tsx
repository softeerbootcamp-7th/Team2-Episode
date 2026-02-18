import EpisodeBar from "@/features/episode_archive/components/episodeContainer/EpisodeBar";
import EpisodeItemColumn from "@/features/episode_archive/components/episodeContainer/EpisodeItemColumn";
import { EpisodeSummary } from "@/features/episode_archive/types/episode";
import { cn } from "@/utils/cn";

type Props = {
    mindmapName: string;
    episodes: EpisodeSummary[];
};

export default function MindmapEpisodeContainer({ mindmapName, episodes }: Props) {
    return (
        <div className="flex flex-col w-full">
            {/* 섹션 영역: py-10 (40px) */}
            <section className="flex flex-col w-full py-10">
                {/* 타이틀: mb-8 (32px) */}
                <h2 className="typo-title-28-bold text-text-main2 mb-8 px-2">{mindmapName}</h2>

                <div className="flex flex-col w-full">
                    <EpisodeBar />
                    {/* 에피소드 리스트 간격: mt-2 (8px) */}
                    <div className="flex flex-col mt-2">
                        {episodes.map((ep) => (
                            <EpisodeItemColumn key={ep.nodeId} summary={ep} />
                        ))}
                    </div>
                </div>
            </section>

            {/* 컨테이너 간 구분선 (5px)
              - h-[5px]: 커스텀 높이
              - bg-gray-100: 테마에 정의된 #f7f7f9 적용
              - shadow-[inset...]: 테마의 gray-500(#acadb4)을 활용한 안쪽 그림자
            */}
            <div className={cn("h-1.25 w-full self-stretch border-none", "bg-gray-100")} />
        </div>
    );
}
