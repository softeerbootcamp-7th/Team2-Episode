import { useMutation, useQueryClient } from "@tanstack/react-query";

import { episodeEndpoints } from "@/shared/api/api";
import { del } from "@/shared/api/method";

/** 특정 에피소드를 영구 삭제하고 전체 리스트 쿼리를 갱신하는 훅입니다. */
export const useEpisodeDelete = (nodeId: string, mindmapId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => del({ endpoint: episodeEndpoints.delete(nodeId) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["episodes", "list", mindmapId] });
        },
    });
};
