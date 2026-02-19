import { useQuery } from "@tanstack/react-query";

import { MindmapGroupResponse, SearchEpisodesReq } from "@/features/episode_archive/types/episode";
import { episodeEndpoints } from "@/shared/api/api";
import { get } from "@/shared/api/method";

/**
 * 필터링 조건 및 검색어에 따라 통합 에피소드 목록을 조회하는 훅입니다.
 */
export const useEpisodeSearch = (params: SearchEpisodesReq) => {
    return useQuery<MindmapGroupResponse[]>({
        queryKey: ["episodes", "search", params],
        queryFn: () =>
            get<MindmapGroupResponse[], SearchEpisodesReq>({
                endpoint: episodeEndpoints.search,
                params: {
                    ...params,
                    mindmapId: params.mindmapId || undefined,
                },
            }),
        enabled: true,
        staleTime: 1000 * 60 * 5, // 5분
    });
};
