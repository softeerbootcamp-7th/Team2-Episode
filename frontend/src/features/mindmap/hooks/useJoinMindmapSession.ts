import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/features/auth/types/api";
import { post } from "@/shared/api/method";
import { BadRequestError, BaseError } from "@/shared/utils/errors";

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
            throw new BadRequestError("잘못된 요청입니다.");
        }

        // 개인마인드맵에 join하려하면 403 + MINDMAP_ACCESS_FORBIDDEN로 오류옵니다.
        // participants가 필요한거면 403 + MINDMAP_PARTICIPANT_NOT_FOUND 오류옵니다.
        if (e instanceof ApiError && e.status === 403 && e.code === "MINDMAP_ACCESS_FORBIDDEN") {
            throw new BadRequestError("개인 마인드맵에는 참여할 수 없습니다.");
        }

        if (curRetryCount < maxRetryCount) {
            try {
                await postParticipants(mindmapId);

                toast.success(`참여 등록이 완료되었습니다. 마인드맵 참여를 시작합니다.`);

                return await fetchJoinSession(mindmapId, maxRetryCount, curRetryCount + 1);
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
        throwOnError: (error) => {
            return error instanceof BaseError && error.displayType === "replace";
        },
    });
};
