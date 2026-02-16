import { useState } from "react";

import MindmapHeaderToolBar, { ActiveAction } from "@/features/mindmap/components/bar/MindmapHeaderToolBar";

export default function EpisodeArchivePage() {
    const [activeAction, setActiveAction] = useState<ActiveAction>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // 1. 역량 필터 클릭 시
    const handleFilterClick = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    // 2. 검색창 포커스 시 -> 필터만 닫음 (액션 상태는 유지)
    const handleSearchFocus = () => {
        setIsFilterOpen(false);
    };

    // 3. 기출문항 클릭 시 -> 필터 닫고, 액션 토글 (이미 열려있으면 닫기)
    const handleSelfTestClick = () => {
        setIsFilterOpen(false);
        setActiveAction((prev) => (prev === "selfTest" ? null : "selfTest"));
    };

    // 4. STAR 정리하기 클릭 시 -> 필터 닫고, 액션 토글
    const handleStarClick = () => {
        setIsFilterOpen(false);
        setActiveAction((prev) => (prev === "star" ? null : "star"));
    };

    return (
        <div>
            <MindmapHeaderToolBar
                title="마인드맵"
                isFilterOpen={isFilterOpen}
                onFilterClick={handleFilterClick}
                activeAction={activeAction}
                onSelfTestClick={handleSelfTestClick}
                onStarOrganizeClick={handleStarClick}
                onSearchFocus={handleSearchFocus}
            />

            {/* 우측 사이드바 예시 */}
            {/* {activeAction === "selfTest" && <SelfTestSidebar />}
            {activeAction === "star" && <StarSidebar />}

            {/* 필터 레이어 예시 */}
            {/* {isFilterOpen && <FilterOverlay />} */}
        </div>
    );
}
