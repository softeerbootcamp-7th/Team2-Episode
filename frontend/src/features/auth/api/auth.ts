import { queryOptions } from "@tanstack/react-query";

import { AUTH_ENDPOINT } from "@/features/auth/api/api";
import { toSafeApiError } from "@/features/auth/api/error";
import { AUTH_QUERY_KEYS } from "@/features/auth/constants/query_key";
import { type ApiError } from "@/features/auth/types/api";
import { AuthUser } from "@/features/auth/types/auth";
import { fetchMeOrNull } from "@/features/auth/utils/fetchMeOrNull";
import { post } from "@/shared/api/method";
import { queryClient } from "@/shared/api/query_client";

export const AUTH_LOGOUT_ENDPOINT = `${AUTH_ENDPOINT}/logout`;

// 로그아웃
export const logout = async (): Promise<void | ApiError> => {
    try {
        await post<void, Record<string, never>>({ endpoint: AUTH_LOGOUT_ENDPOINT });
    } catch (error) {
        return toSafeApiError(error);
    }
};

queryClient.setQueryDefaults(AUTH_QUERY_KEYS.user, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
});

export const userQueryOptions = queryOptions<AuthUser>({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: fetchMeOrNull, // 401이면 null, 500이면 throw하는 그 함수
    staleTime: 1000 * 60 * 4,
    retry: false,
});
