import { EpisodeContent } from "@/features/episode_archive/components/EpisodeContent";
import EpisodeTitle from "@/features/episode_archive/components/EpisodeTitle";
import { MindMapProvider } from "@/features/mindmap/providers/MindmapProvider";
import MaxWidth from "@/shared/components/max_width/MaxWidth";

export default function EpisodeArchivePage() {
    return (
        <MindMapProvider>
            <MaxWidth maxWidth="lg" className="h-screen flex flex-col overflow-hidden">
                <div className="flex flex-col w-full gap-10 pt-10 pb-4 flex-1 overflow-hidden">
                    <EpisodeTitle />
                    <EpisodeContent />
                </div>
            </MaxWidth>
        </MindMapProvider>
    );
}
