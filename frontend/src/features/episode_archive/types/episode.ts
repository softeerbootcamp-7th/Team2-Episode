import { MindmapType } from "@/features/mindmap/types/mindmap";
import { HttpParams } from "@/shared/api/types";

/** 에피소드 내 역량 태그 타입 */
export type CompetencyTag = {
    id: number;
    category: string;
    competencyType: string;
};

/** * 에피소드 요약 정보 (리스트 조회용)
 * EpisodeDetail에서 상세 STAR 내용을 제외한 구조입니다.
 */
export type EpisodeSummary = {
    nodeId: string;
    mindmapId: string;
    content: string;
    startDate: string;
    endDate: string;
};

/** 에피소드 상세 정보 (STAR 및 메타데이터 포함) */
export type EpisodeDetail = {
    nodeId: string;
    mindmapId: string;
    content: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    startDate: string;
    endDate: string;
    competencyTypes: CompetencyTag[];
    createdAt: string;
    updatedAt: string;
};

/** 상세 정보 응답 타입 (상세 조회 API 전용) */
export type EpisodeDetailResponse = EpisodeDetail;

/** 통합 검색 응답: 마인드맵 그룹 구조 */
export type MindmapGroupResponse = {
    mindmapId: string;
    mindmapName: string;
    isShared: boolean;
    episodes: EpisodeDetail[];
};

/** 에피소드 통합 검색 요청 파라미터 (HttpParams 확장) */
export type SearchEpisodesReq = HttpParams & {
    mindmapId?: string;
    mindmapType: MindmapType;
    search: string;
};

/** 에피소드 수정 API 요청 바디 */
export type UpdateEpisodeRequest = {
    competencyTypeIds?: number[];
    situation?: string | null;
    task?: string | null;
    action?: string | null;
    result?: string | null;
    content?: string | null;
    startDate?: {
        present?: boolean;
        undefined?: boolean;
    };
    endDate?: {
        present?: boolean;
        undefined?: boolean;
    };
};
