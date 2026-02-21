import { queryOptions } from "@tanstack/react-query";

import { AUTH_ENDPOINT } from "@/features/auth/api/api";
import { toSafeApiError } from "@/features/auth/api/error";
import { AUTH_QUERY_KEYS } from "@/features/auth/constants/query_key";
import { type ApiError } from "@/features/auth/types/api";
import type { User } from "@/features/auth/types/user";
import { fetchMeOrNull } from "@/features/auth/utils/fetchMeOrNull";
import { post } from "@/shared/api/method";

export const AUTH_LOGOUT_ENDPOINT = `${AUTH_ENDPOINT}/logout`;

// 로그아웃
export const logout = async (): Promise<void | ApiError> => {
    try {
        await post<void, Record<string, never>>({ endpoint: AUTH_LOGOUT_ENDPOINT });
    } catch (error) {
        return toSafeApiError(error);
    }
};

type AuthUser = User | null;

const userQueryOptions = queryOptions<AuthUser>({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: fetchMeOrNull,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: "always",
});

export const getUserQueryOptions = () => userQueryOptions;
