import EpisodeSearch from "@/features/episode_archive/components/EpisodeSearch";
import MindmapFilter from "@/features/episode_archive/components/MindmapFilter";
import { MindmapItem } from "@/features/mindmap/types/mindmap";

type Props = {
    mindmapList: MindmapItem[];
    selectedMindmapId: string;
    onFilterChange: (id: string) => void;
    onSearch: (val: string) => void;
};

export default function EpisodeHeader({ mindmapList, selectedMindmapId, onFilterChange, onSearch }: Props) {
    return (
        <div className="flex items-center w-full gap-8 h-12">
            <MindmapFilter mindmapList={mindmapList} value={selectedMindmapId} onChange={onFilterChange} />
            <EpisodeSearch onSearch={onSearch} />
        </div>
    );
}
