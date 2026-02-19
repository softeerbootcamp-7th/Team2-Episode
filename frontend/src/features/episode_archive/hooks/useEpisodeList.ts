import { useQuery } from "@tanstack/react-query";

import { EpisodeSummary } from "@/features/episode_archive/types/episode";
import { episodeEndpoints } from "@/shared/api/api";
import { get } from "@/shared/api/method";

/** 특정 마인드맵에 속한 모든 에피소드의 기본 요약 리스트를 조회하는 훅입니다. */
export const useEpisodeList = (mindmapId: string) => {
    return useQuery<EpisodeSummary[]>({
        queryKey: ["episodes", "list", mindmapId],
        queryFn: () =>
            get<EpisodeSummary[]>({
                endpoint: episodeEndpoints.list(mindmapId),
            }),
        enabled: mindmapId !== "",
    });
};
