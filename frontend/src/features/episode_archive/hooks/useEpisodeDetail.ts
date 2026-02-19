import { useQuery } from "@tanstack/react-query";

import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import { episodeEndpoints } from "@/shared/api/api";
import { get } from "@/shared/api/method";

/** 사용자의 스크롤 위치가 해당 에피소드 영역에 도달했을 때(isVisible => true) 상세 정보를 조회하는 훅입니다. */
export const useEpisodeDetail = (nodeId: string, isVisible: boolean) => {
    return useQuery<EpisodeDetailResponse>({
        queryKey: ["episodes", "detail", nodeId],
        queryFn: () =>
            get<EpisodeDetailResponse>({
                endpoint: episodeEndpoints.detail(nodeId),
            }),
        // isVisible이 true(스크롤 감지)일 때만 실제 API를 호출합니다.
        enabled: isVisible && nodeId !== "",
        staleTime: 1000 * 60 * 60,
    });
};
