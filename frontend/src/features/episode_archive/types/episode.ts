/** 에피소드 요약 정보 (리스트 조회용) */
export type EpisodeSummary = {
    nodeId: string;
    mindmapId: string;
    content: string;
    startDate: string;
    endDate: string;
};

/** 에피소드 STAR 컨텐츠 및 역량 필드 */
export type EpisodeContent = {
    competencyTypes: competencyType[];
    situation: string;
    task: string;
    action: string;
    result: string;
};

/** 에피소드 수정을 위한 요청 데이터 (모든 필드 필수값) */
export type UpdateEpisodeRequest = EpisodeContent & {
    startDate: string;
    endDate: string;
};

/** 에피소드 상세 정보 응답 데이터 */
export type EpisodeDetailResponse = EpisodeSummary &
    EpisodeContent & {
        createdAt: string;
        updatedAt: string;
    };

export type competencyType = {
    id: number;
    category: string;
    competencyType: string;
};
