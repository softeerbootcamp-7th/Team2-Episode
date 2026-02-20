import { useSuspenseQuery } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { mindmapKeys } from "@/features/mindmap/api/mindmap_query_keys";
import { MindmapItem, MindmapType } from "@/features/mindmap/types/mindmap";
import { mindmapEndpoints } from "@/shared/api/api";
import { get } from "@/shared/api/method";

const fetchGetMindmapList = (type: MindmapType = "ALL") => {
    return get<MindmapItem[]>({
        endpoint: mindmapEndpoints.list(),
        params: {
            type,
        },
    });
};

type Props = {
    type?: MindmapType;
};

export const useMindmapList = ({ type = "ALL" }: Props) => {
    return useSuspenseQuery<MindmapItem[], ApiError>({
        queryKey: mindmapKeys.list({ type }),
        queryFn: () => fetchGetMindmapList(type),
        staleTime: 1000 * 60,
    });
};
