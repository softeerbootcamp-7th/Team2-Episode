import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/features/auth/types/api";
import { post } from "@/shared/api/method";

export type JoinSessionResponse = {
    token: string;
    presignedUrl: string;
};

const postParticipants = (mindmapId: string) => {
    return post({ endpoint: `/mindmaps/${mindmapId}/participants` });
};

const fetchJoinSession = async (
    mindmapId: string,
    maxRetryCount: number,
    curRetryCount: number = 0,
): Promise<JoinSessionResponse> => {
    try {
        return await post<JoinSessionResponse, { mindmapId: string }>({
            endpoint: `/mindmaps/${mindmapId}/sessions/join`,
        });
    } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 403 || curRetryCount >= maxRetryCount) {
            throw new Error("알 수 없는 오류입니다. 다시 시도해주세요.");
        }

        if (curRetryCount < maxRetryCount) {
            try {
                await postParticipants(mindmapId);

                toast.success(`참여 등록이 완료되었습니다. 마인드맵 참여를 시작합니다.`);

                return await fetchJoinSession(mindmapId, curRetryCount + 1);
            } catch (participantError) {
                console.error("참여자 등록 실패:", participantError);
                throw participantError;
            }
        }

        throw e;
    }
};

export const useJoinMindmapSession = ({
    mindmapId,
    maxRetryCount = 3,
}: {
    mindmapId: string;
    maxRetryCount?: number;
}) => {
    return useMutation<JoinSessionResponse, ApiError, string>({
        mutationFn: () => fetchJoinSession(mindmapId, maxRetryCount),
        onError: (error) => {
            console.error("세션 참여 실패:", error.message);
        },
    });
};
