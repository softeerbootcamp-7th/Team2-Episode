import { useCallback, useState } from "react";

import EmptyEpisode from "@/features/episode_archive/components/EmptyEpisode";
import MindmapEpisodeContainer from "@/features/episode_archive/components/EpisodeContainer/MindmapEpisodeContainer";
import EpisodeHeader from "@/features/episode_archive/components/EpisodeHeader";
import { useEpisodeSearch } from "@/features/episode_archive/hooks/useEpisodeSearch";
import { useMindmapList } from "@/features/mindmap/hooks/useMindmapList";
import { MINDMAP_TABS, MindmapType } from "@/features/mindmap/types/mindmap";
import Spinner from "@/shared/components/spinner/Spinner";
import Tab from "@/shared/components/tabs/Tab";
import TabItem from "@/shared/components/tabs/TabItem";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useTabs } from "@/shared/hooks/useTabs";

export function EpisodeContent() {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedMindmapId, setSelectedMindmapId] = useState<string>("");

    const { selectedValue: tabId, onChange: onTabChange } = useTabs<MindmapType>("ALL");
    const debouncedSearch = useDebounce<string>(searchQuery, 500);

    // useSuspenseQuery를 내부에서 사용하므로, 상위 Suspense Boundary에서 로딩을 가로챕니다.
    const { data: mindmaps } = useMindmapList({ type: tabId });

    const { data: results, isLoading } = useEpisodeSearch({
        mindmapType: tabId,
        mindmapId: selectedMindmapId,
        search: debouncedSearch,
    });

    const handleTabChange = useCallback(
        (id: MindmapType) => {
            onTabChange(id);
            setSelectedMindmapId("");
        },
        [onTabChange],
    );

    return (
        <div className="flex flex-col gap-6 flex-1 overflow-hidden w-full">
            <EpisodeHeader
                mindmapList={mindmaps || []}
                selectedMindmapId={selectedMindmapId}
                onFilterChange={setSelectedMindmapId}
                onSearch={setSearchQuery}
            />

            <Tab layout="fullWidth" selectedTabId={tabId} onChange={handleTabChange}>
                {MINDMAP_TABS.map((tab) => (
                    <TabItem key={tab.id} id={tab.id} label={tab.label} />
                ))}
            </Tab>

            <div className="flex-1 w-full overflow-y-auto px-1 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner />
                    </div>
                ) : results && results.length > 0 ? (
                    <div className="flex flex-col w-full pb-20">
                        {results.map((group) => (
                            <MindmapEpisodeContainer
                                key={group.mindmapId}
                                mindmapName={group.mindmapName}
                                episodes={group.episodes}
                                searchTerm={debouncedSearch}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyEpisode />
                )}
            </div>
        </div>
    );
}
