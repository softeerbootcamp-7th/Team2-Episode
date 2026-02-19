import { useMutation, useQueryClient } from "@tanstack/react-query";

import { episodeEndpoints } from "@/shared/api/api";
import { put } from "@/shared/api/method";

export const useClearEpisode = (nodeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            put<void, object>({
                endpoint: episodeEndpoints.clear(nodeId),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["episodes", "search"] });
        },
    });
};
