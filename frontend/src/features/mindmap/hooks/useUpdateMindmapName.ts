import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { mindmapEndpoints } from "@/features/mindmap/api/mindmap_endpoints";
import { mindmapKeys } from "@/features/mindmap/api/mindmap_query_keys";
import { patch } from "@/shared/api/method";

type UpdateMindmapNameBody = {
    name: string;
};

type UpdateMindmapNameParams = {
    mindmapId: string;
    name: string;
};

const fetchUpdateMindmapName = ({ mindmapId, name }: UpdateMindmapNameParams) => {
    return patch<void, UpdateMindmapNameBody>({
        endpoint: mindmapEndpoints.rename(mindmapId),
        data: { name },
    });
};

export const useUpdateMindmapName = () => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, UpdateMindmapNameParams>({
        mutationFn: fetchUpdateMindmapName,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mindmapKeys.lists() });
        },
        onError: (error) => {
            console.error("마인드맵 이름 변경 실패:", error);
        },
    });
};
