// EpisodeSummary 대신 EpisodeDetail을 가져옵니다.
import EpisodeBar from "@/features/episode_archive/components/EpisodeContainer/EpisodeBar";
import EpisodeItemColumn from "@/features/episode_archive/components/EpisodeContainer/EpisodeItemColumn";
import { EpisodeDetail } from "@/features/episode_archive/types/episode";
import { cn } from "@/utils/cn";

type Props = {
    mindmapName: string;
    episodes: EpisodeDetail[];
    searchTerm?: string;
};

export default function MindmapEpisodeContainer({ mindmapName, episodes, searchTerm }: Props) {
    return (
        <div className="flex flex-col w-full">
            <section className="flex flex-col w-full py-10">
                <h2 className="typo-title-28-bold text-text-main2 mb-8 px-2">{mindmapName}</h2>

                <div className="flex flex-col w-full">
                    <EpisodeBar />
                    <div className="flex flex-col mt-2">
                        {episodes.map((ep) => (
                            <EpisodeItemColumn key={ep.nodeId} summary={ep} searchTerm={searchTerm} />
                        ))}
                    </div>
                </div>
            </section>

            <div className={cn("h-1.25 w-full self-stretch border-none bg-gray-100")} />
        </div>
    );
}
