import { queryOptions } from "@tanstack/react-query";

import { AUTH_ENDPOINT } from "@/features/auth/api/api";
import { isApiError, toSafeApiError } from "@/features/auth/api/error";
import { AUTH_QUERY_KEYS } from "@/features/auth/constants/query_key";
import { type ApiError } from "@/features/auth/types/api";
import { User } from "@/features/auth/types/user";
import { USER_ME_ENDPOINT } from "@/shared/api/api";
import { get, post } from "@/shared/api/method";

export const AUTH_LOGOUT_ENDPOINT = `${AUTH_ENDPOINT}/logout`;

// 로그아웃
export const logout = async (): Promise<void | ApiError> => {
    try {
        await post<void, Record<string, never>>({ endpoint: AUTH_LOGOUT_ENDPOINT });
    } catch (error) {
        return toSafeApiError(error);
    }
};

export const authQueryOptions = queryOptions<User | null>({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: async () => {
        try {
            return await get<User>({ endpoint: USER_ME_ENDPOINT });
        } catch (error: unknown) {
            if (isApiError(error)) {
                const status = error.status ?? error.status;
                // 401(Unauthorized), 403(Forbidden)은 비로그인으로 간주
                if (status === 401 || status === 403) return null;
            }
            // 그 외 진짜 시스템 장애(500 등)는 throw하여 ServiceErrorBoundary로 전달
            throw error;
        }
    },
    staleTime: 1000 * 60 * 5,
});
