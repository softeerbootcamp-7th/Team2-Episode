import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { mindmapEndpoints } from "@/features/mindmap/api/mindmap_endpoints";
import { mindmapKeys } from "@/features/mindmap/api/mindmap_query_keys";
import { patch } from "@/shared/api/method";

type UpdateMindmapFavoriteParams = {
    mindmapId: string;
    status: boolean;
};

const fetchUpdateMindmapFavorite = ({ mindmapId, status }: UpdateMindmapFavoriteParams) => {
    return patch<void, object, { status: boolean }>({
        endpoint: mindmapEndpoints.favorite(mindmapId),
        data: {},
        params: { status },
    });
};

export const useUpdateMindmapFavorite = () => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, UpdateMindmapFavoriteParams>({
        mutationFn: fetchUpdateMindmapFavorite,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mindmapKeys.lists() });
        },
        onError: (error) => {
            console.error("즐겨찾기 설정 실패:", error);
        },
    });
};
