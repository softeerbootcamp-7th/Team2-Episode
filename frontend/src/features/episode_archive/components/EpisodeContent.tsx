import { useCallback, useState } from "react";

import EmptyEpisode from "@/features/episode_archive/components/EmptyEpisode";
import MindmapEpisodeContainer from "@/features/episode_archive/components/episodeContainer/MindmapEpisodeContainer";
import EpisodeHeader from "@/features/episode_archive/components/EpisodeHeader";
import { useEpisodeSearch } from "@/features/episode_archive/hooks/useEpisodeSearch";
import { useMindmapList } from "@/features/mindmap/hooks/useMindmapList";
import { MINDMAP_TABS, MindmapType } from "@/features/mindmap/types/mindmap";
import Spinner from "@/shared/components/spinner/Spinner";
import Tab from "@/shared/components/tabs/Tab";
import TabItem from "@/shared/components/tabs/TabItem";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useTabs } from "@/shared/hooks/useTabs";

/**
 * 에피소드 보관함의 메인 컨텐츠 컴포넌트입니다.
 * 탭 필터링, 검색, 마인드맵별 그룹화된 리스트 렌더링을 실제 API와 연동하여 처리합니다.
 */
export function EpisodeContent() {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedMindmapId, setSelectedMindmapId] = useState<string>("");

    // 탭 상태 관리 (ALL | PERSONAL | SHARED)
    const { selectedValue: tabId, onChange: onTabChange } = useTabs<MindmapType>("ALL");

    // 검색어 입력 최적화를 위한 디바운스 (500ms 지연)
    const debouncedSearch = useDebounce<string>(searchQuery, 500);

    // 1. 헤더 드롭다운 및 필터링을 위한 마인드맵 리스트 조회
    const { data: mindmaps } = useMindmapList({ type: tabId });

    // 2. 실제 에피소드 통합 검색 API 호출
    // MindmapGroupResponse[] 타입을 반환하며, 내부에 EpisodeDetail[]이 포함되어 있습니다.
    const { data: results, isLoading } = useEpisodeSearch({
        mindmapType: tabId,
        mindmapId: selectedMindmapId,
        search: debouncedSearch,
    });

    /** 탭 변경 시 호출되는 핸들러입니다. 선택된 마인드맵 필터를 초기화합니다. */
    const handleTabChange = useCallback(
        (id: MindmapType) => {
            onTabChange(id);
            setSelectedMindmapId("");
        },
        [onTabChange],
    );

    return (
        <div className="flex flex-col gap-6 flex-1 overflow-hidden w-full">
            {/* 상단 필터 및 검색 바 */}
            <EpisodeHeader
                mindmapList={mindmaps || []}
                selectedMindmapId={selectedMindmapId}
                onFilterChange={setSelectedMindmapId}
                onSearch={setSearchQuery}
            />

            {/* 마인드맵 타입 선택 탭 영역 */}
            <Tab layout="fullWidth" selectedTabId={tabId} onChange={handleTabChange}>
                {MINDMAP_TABS.map((tab) => (
                    <TabItem key={tab.id} id={tab.id} label={tab.label} />
                ))}
            </Tab>

            {/* 에피소드 리스트 렌더링 영역 */}
            <div className="flex-1 w-full overflow-y-auto px-1 custom-scrollbar">
                {isLoading ? (
                    // 데이터 로딩 중 표시
                    <div className="flex items-center justify-center py-20">
                        <Spinner />
                    </div>
                ) : results && results.length > 0 ? (
                    // 검색 결과가 존재할 때: 마인드맵 그룹별로 컨테이너 렌더링
                    <div className="flex flex-col w-full pb-20">
                        {results.map((group) => (
                            <MindmapEpisodeContainer
                                key={group.mindmapId}
                                mindmapName={group.mindmapName}
                                episodes={group.episodes} // EpisodeDetail[] 타입 전달
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
