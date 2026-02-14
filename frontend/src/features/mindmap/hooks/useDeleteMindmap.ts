import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { mindmapEndpoints } from "@/features/mindmap/api/mindmap_endpoints";
import { mindmapKeys } from "@/features/mindmap/api/mindmap_query_keys";
import { del } from "@/shared/api/method";

const fetchDeleteMindmap = (mindmapId: string) => {
    return del<void>({
        endpoint: mindmapEndpoints.delete(mindmapId),
    });
};

export const useDeleteMindmap = () => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: fetchDeleteMindmap,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mindmapKeys.lists() });
        },
        onError: (error) => {
            console.error("마인드맵 삭제 실패:", error.message);
        },
    });
};
