import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { mindmapEndpoints } from "@/features/mindmap/api/mindmap_endpoints";
import { mindmapKeys } from "@/features/mindmap/api/mindmap_query_keys";
import { MindmapItem } from "@/features/mindmap/types/mindmap";
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

    interface MutationContext {
        previousList?: MindmapItem[];
    }

    return useMutation<void, ApiError, { mindmapId: string; status: boolean }, MutationContext>({
        mutationFn: fetchUpdateMindmapFavorite,
        onMutate: async ({ mindmapId, status }) => {
            await queryClient.cancelQueries({ queryKey: mindmapKeys.lists() });

            const previousList = queryClient.getQueryData<MindmapItem[]>(mindmapKeys.lists());

            queryClient.setQueryData<MindmapItem[]>(mindmapKeys.lists(), (old) => {
                if (!old) return [];
                return old.map((item) => (item.mindmapId === mindmapId ? { ...item, isFavorite: status } : item));
            });

            return { previousList };
        },
        onError: (err, variables, context) => {
            if (context?.previousList) {
                queryClient.setQueryData(mindmapKeys.lists(), context.previousList);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: mindmapKeys.lists() });
        },
    });
};
