import EpisodeBar from "@/features/episode_archive/components/episodeContainer/EpisodeBar";
import EpisodeItemColumn from "@/features/episode_archive/components/episodeContainer/EpisodeItemColumn";
// EpisodeSummary 대신 EpisodeDetail을 가져옵니다.
import { EpisodeDetail } from "@/features/episode_archive/types/episode";
import { cn } from "@/utils/cn";

type Props = {
    mindmapName: string;
    // 타입을 EpisodeDetail[]로 변경하여 하위 컴포넌트와의 타입 불일치를 해결합니다.
    episodes: EpisodeDetail[];
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
                    {/* 이제 ep는 EpisodeDetail 타입이므로 EpisodeItemColumn에 전달 시 에러가 나지 않습니다. */}
                    <div className="flex flex-col mt-2">
                        {episodes.map((ep) => (
                            <EpisodeItemColumn key={ep.nodeId} summary={ep} />
                        ))}
                    </div>
                </div>
            </section>

            {/* 컨테이너 간 구분선 (5px) */}
            <div className={cn("h-1.25 w-full self-stretch border-none bg-gray-100")} />
        </div>
    );
}
