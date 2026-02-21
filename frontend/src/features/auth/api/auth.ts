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

export const fetchCurrentUser = async (skipRefresh = true): Promise<User | null> => {
    try {
        return await get<User>({
            endpoint: USER_ME_ENDPOINT,
            options: { skipRefresh },
        });
    } catch (error: unknown) {
        if (isApiError(error) && (error.status === 401 || error.status === 403)) {
            return null;
        }
        throw error;
    }
};

export const authQueryOptions = queryOptions({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: () => fetchCurrentUser(true),
    staleTime: 1000 * 60 * 5,
});
