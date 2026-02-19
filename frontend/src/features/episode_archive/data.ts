import { EpisodeDetailResponse, EpisodeSummary } from "@/features/episode_archive/types/episode";

/** 테스트를 위한 마인드맵별 에피소드 목 데이터입니다. */
export const MOCK_MINDMAPS = [
    { mindmapId: "m1", mindmapName: "현대자동차 마케팅 프로젝트" },
    { mindmapId: "m2", mindmapName: "데이터 분석 부트캠프" },
];

export const MOCK_EPISODE_LIST: Record<string, EpisodeSummary[]> = {
    m1: [
        {
            nodeId: "n1",
            mindmapId: "m1",
            content: "고객 데이터 분석으로 게시물 참여율 상승",
            startDate: "2024.03.05",
            endDate: "2024.08.31",
        },
        {
            nodeId: "n2",
            mindmapId: "m1",
            content: "고객 접점 개선을 위한 현장 인사이트 도출",
            startDate: "2024.09.01",
            endDate: "2024.12.31",
        },
    ],
    m2: [
        {
            nodeId: "n3",
            mindmapId: "m2",
            content: "데이터 기반 캠페인 전략 기획 경험",
            startDate: "2024.03.05",
            endDate: "2024.08.31",
        },
    ],
};

export const MOCK_EPISODE_DETAILS: Record<string, EpisodeDetailResponse> = {
    n1: {
        nodeId: "n1",
        mindmapId: "m1",
        content: "고객 데이터 분석으로 게시물 참여율 상승",
        startDate: "2024.03.05",
        endDate: "2024.08.31",
        situation:
            "현대자동차 마케팅 부서 인턴으로 근무하며, 신차 출시 이후 디지털 채널 반응이 기대에 미치지 못하는 상황을 접함",
        task: "온라인 고객 반응 데이터를 분석하여 문제 원인을 도출하고, 디지털 콘텐츠 개선 방향을 제안하는 역할을 수행",
        action: "SNS 커뮤니티 댓글과 조회수 데이터를 정리해 주요 이슈를 분류하고, 타겟 고객 관심사가 반영된 콘텐츠 아이디어를 기획해 보고서로 제출함",
        result: "제안한 방향이 일부 콘텐츠에 반영되며 게시물 참여율이 이전 대비 증가했고, 데이터 기반 인사이트 도출 역량을 인정받음",
        competencyTypes: [
            { id: 1, category: "공통", competencyType: "인턴" },
            { id: 2, category: "활동", competencyType: "동아리" },
        ],
        createdAt: "2024-03-05T00:00:00Z",
        updatedAt: "2024-08-31T00:00:00Z",
    },
    n2: {
        nodeId: "n2",
        mindmapId: "m1",
        content: "고객 데이터 분석으로 게시물 참여율 상승",
        startDate: "2024.03.05",
        endDate: "2024.08.31",
        situation: "",
        task: "",
        action: "",
        result: "",
        competencyTypes: [
            { id: 1, category: "공통", competencyType: "인턴" },
            { id: 2, category: "활동", competencyType: "동아리" },
        ],
        createdAt: "2024-03-05T00:00:00Z",
        updatedAt: "2024-08-31T00:00:00Z",
    },
    n3: {
        nodeId: "n3",
        mindmapId: "m1",
        content: "고객 데이터 분석으로 게시물 참여율 상승",
        startDate: "2024.03.05",
        endDate: "2024.08.31",
        situation:
            "현대자동차 마케팅 부서 인턴으로 근무하며, 신차 출시 이후 디지털 채널 반응이 기대에 미치지 못하는 상황을 접함",
        task: "온라인 고객 반응 데이터를 분석하여 문제 원인을 도출하고, 디지털 콘텐츠 개선 방향을 제안하는 역할을 수행",
        action: "SNS 커뮤니티 댓글과 조회수 데이터를 정리해 주요 이슈를 분류하고, 타겟 고객 관심사가 반영된 콘텐츠 아이디어를 기획해 보고서로 제출함",
        result: "제안한 방향이 일부 콘텐츠에 반영되며 게시물 참여율이 이전 대비 증가했고, 데이터 기반 인사이트 도출 역량을 인정받음",
        competencyTypes: [
            { id: 1, category: "공통", competencyType: "인턴" },
            { id: 2, category: "활동", competencyType: "동아리" },
        ],
        createdAt: "2024-03-05T00:00:00Z",
        updatedAt: "2024-08-31T00:00:00Z",
    },
    // n2, n3... 유사하게 구성
};
