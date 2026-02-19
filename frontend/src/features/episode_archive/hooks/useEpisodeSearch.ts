import { useQuery } from "@tanstack/react-query";

import { MindmapGroupResponse, SearchEpisodesReq } from "@/features/episode_archive/types/episode";
import { get } from "@/shared/api/method";

/**
 * 필터링 조건 및 검색어에 따라 통합 에피소드 목록을 조회하는 훅입니다.
 * 내부에서 API 호출 함수를 포함하고 있어 외부에서 fetch 함수를 따로 관리할 필요가 없습니다.
 */
export const useEpisodeSearch = (params: SearchEpisodesReq) => {
    return useQuery<MindmapGroupResponse[]>({
        queryKey: ["episodes", "search", params],
        queryFn: () =>
            get<MindmapGroupResponse[], SearchEpisodesReq>({
                endpoint: "/api/episodes",
                params: {
                    ...params,
                    // mindmapId가 ""일 경우 undefined를 전달하여 전체 조회를 수행합니다.
                    mindmapId: params.mindmapId || undefined,
                },
            }),
        enabled: true,
        staleTime: 1000 * 60 * 5, // 5분
    });
};
