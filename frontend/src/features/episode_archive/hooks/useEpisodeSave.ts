import { useMutation, useQueryClient } from "@tanstack/react-query";

import { UpdateEpisodeRequest } from "@/features/episode_archive/types/episode";
import { episodeEndpoints } from "@/shared/api/api";
import { patch, post } from "@/shared/api/method";

/** 에피소드 내용의 유무에 따라 부분 수정(PATCH) */
export const useEpisodeSave = (nodeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateEpisodeRequest) => {
            const isContentEmpty =
                data.situation === "" && data.task === "" && data.action === "" && data.result === "";
            const isTagsEmpty = data.competencyTypes.length === 0;

            if (isContentEmpty && isTagsEmpty) {
                return post({
                    endpoint: episodeEndpoints.clear(nodeId),
                    data: {},
                });
            } else {
                return patch({
                    endpoint: episodeEndpoints.update(nodeId),
                    data,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["episodes", "detail", nodeId] });
        },
    });
};
