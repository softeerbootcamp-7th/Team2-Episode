import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { post } from "@/shared/api/method";

export type JoinSessionResponse = {
    token: string;
    presignedUrl: string;
};

const fetchJoinSession = (mindmapId: string) => {
    return post<JoinSessionResponse, { mindmapId: string }>({
        endpoint: `/mindmaps/${mindmapId}/sessions/join`,
    });
};

export const useJoinMindmapSession = () => {
    return useMutation<JoinSessionResponse, ApiError, string>({
        mutationFn: fetchJoinSession,
        onError: (error) => {
            console.error("세션 참여 실패:", error.message);
        },
    });
};
