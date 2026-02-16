import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { mindmapEndpoints } from "@/features/mindmap/api/mindmap_endpoints";
import { mindmapKeys } from "@/features/mindmap/api/mindmap_query_keys";
import { MindmapItem } from "@/features/mindmap/types/mindmap";
import { post } from "@/shared/api/method";

type CreateMindmapRequest = {
    isShared: boolean;
    title: string;
};

type CreateMindmapResponse = {
    mindmap: Omit<MindmapItem, "createdAt" | "updatedAt">;
};

const fetchCreateMindmap = (body: CreateMindmapRequest) => {
    return post<CreateMindmapResponse, CreateMindmapRequest>({
        endpoint: mindmapEndpoints.create,
        data: body,
    });
};

export const useCreateMindmap = () => {
    const queryClient = useQueryClient();

    return useMutation<CreateMindmapResponse, ApiError, CreateMindmapRequest>({
        mutationFn: fetchCreateMindmap,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mindmapKeys.lists() });
        },
        onError: (error) => {
            console.error("마인드맵 생성 실패:", error.message);
        },
    });
};
