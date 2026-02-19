import { Suspense, useMemo, useState } from "react";

import MindmapEpisodeContainer from "@/features/episode_archive/components/episodeContainer/MindmapEpisodeContainer";
import EpisodeHeader from "@/features/episode_archive/components/EpisodeHeader";
import { MOCK_EPISODE_LIST, MOCK_MINDMAPS } from "@/features/episode_archive/data";
import { useMindmapList } from "@/features/mindmap/hooks/useMindmapList";
import { MINDMAP_TABS, MindmapTabId } from "@/features/mindmap/types/mindmap";
import Spinner from "@/shared/components/spinner/Spinner";
import Tab from "@/shared/components/tabs/Tab";
import TabItem from "@/shared/components/tabs/TabItem";
import { useTabs } from "@/shared/hooks/useTabs";

/**
 * 검색, 탭 필터링, 마인드맵별 에피소드 리스트 렌더링을 모두 담당하는 메인 컨텐츠 컴포넌트입니다.
 */
export function EpisodeContent() {
    const [searchQuery, setSearchQuery] = useState("");
    const { selectedValue: tabId, onChange: onTabChange } = useTabs<MindmapTabId>("ALL");
    const [selectedMindmapId, setSelectedMindmapId] = useState<string>("");

    // 1. 드롭다운용 마인드맵 리스트 조회 (실제 API 훅)
    const { data: mindmaps } = useMindmapList({ type: tabId });

    // 2. 필터링 로직 (탭 및 드롭다운 선택 결과)
    const targetMindmaps = useMemo(() => {
        if (!selectedMindmapId) return MOCK_MINDMAPS;
        return MOCK_MINDMAPS.filter((m) => m.mindmapId === selectedMindmapId);
    }, [selectedMindmapId]);

    // 3. 검색어에 따른 렌더링 컨텐츠 생성
    const renderedList = targetMindmaps.map((mindmap) => {
        const allEpisodes = MOCK_EPISODE_LIST[mindmap.mindmapId] || [];
        const filteredEpisodes = allEpisodes.filter((ep) =>
            ep.content.toLowerCase().includes(searchQuery.toLowerCase()),
        );

        if (filteredEpisodes.length === 0) return null;

        return (
            <MindmapEpisodeContainer
                key={mindmap.mindmapId}
                mindmapName={mindmap.mindmapName}
                episodes={filteredEpisodes}
            />
        );
    });

    const isResultEmpty = renderedList.every((item) => item === null);

    return (
        <div className="flex flex-col gap-6 flex-1 overflow-hidden">
            {/* 필터 및 검색 바 */}
            <EpisodeHeader
                mindmapList={mindmaps || []}
                selectedMindmapId={selectedMindmapId}
                onFilterChange={setSelectedMindmapId}
                onSearch={setSearchQuery}
            />

            {/* 탭 영역 */}
            <Tab
                layout="fullWidth"
                selectedTabId={tabId}
                onChange={(id) => {
                    onTabChange(id);
                    setSelectedMindmapId(""); // 탭 변경 시 드롭다운 선택 초기화
                }}
            >
                {MINDMAP_TABS.map((tab) => (
                    <TabItem key={tab.id} id={tab.id} label={tab.label} />
                ))}
            </Tab>

            {/* 리스트 스크롤 영역 */}
            <div className="flex-1 w-full overflow-y-auto px-1 custom-scrollbar">
                <Suspense
                    fallback={
                        <div className="flex justify-center py-20">
                            <Spinner />
                        </div>
                    }
                >
                    <div className="flex flex-col w-full pb-20">
                        {isResultEmpty ? (
                            <div className="flex flex-col items-center justify-center py-20 text-text-placeholder typo-body-16-regular">
                                검색 결과와 일치하는 에피소드가 없습니다.
                            </div>
                        ) : (
                            renderedList
                        )}
                    </div>
                </Suspense>
            </div>
        </div>
    );
}
