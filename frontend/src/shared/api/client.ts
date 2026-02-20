import { toSafeApiError } from "@/features/auth/api/error";
import { getRefreshState, refreshToken, setRefreshState } from "@/features/auth/api/refresh";
import { ApiError } from "@/features/auth/types/api";
import type { FetchOptions } from "@/shared/api/types";
import { ERROR_CODES, ErrorCodeKey } from "@/shared/constants/error";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TOKEN_REFRESH_ERROR = new ApiError(401, "TOKEN_EXPIRED", ERROR_CODES.TOKEN_EXPIRED);
/**
 * 토큰 만료 시 자동 갱신 및 재시도하는 API 요청 래퍼
 * @throws {ApiError} 모든 에러를 ApiError 타입으로 변환하여 던집니다
 */
export async function fetchWithAuth<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    try {
        const { skipRefresh = false, params, ...fetchOptions } = options;

        let url = `${API_BASE_URL}${endpoint}`;

        if (params) {
            const searchParams = new URLSearchParams();

            Object.entries(params).forEach(([key, value]) => {
                if (value === undefined || value === null) return;

                if (Array.isArray(value)) {
                    value.forEach((v) => searchParams.append(key, String(v)));
                } else {
                    searchParams.append(key, String(value));
                }
            });

            const queryString = searchParams.toString();
            if (queryString) {
                const separator = url.includes("?") ? "&" : "?";
                url += `${separator}${queryString}`;
            }
        }

        const config: RequestInit = {
            ...fetchOptions,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...fetchOptions.headers,
            },
        };

        let response = await fetch(url, config);

        if (response.status === 401 && !skipRefresh) {
            const { isRefreshing, refreshPromise } = getRefreshState();

            if (isRefreshing && refreshPromise) {
                const refreshed = await refreshPromise;
                if (!refreshed) {
                    throw TOKEN_REFRESH_ERROR;
                }
            } else {
                const promise = refreshToken();
                setRefreshState(true, promise);

                try {
                    const refreshed = await promise;
                    if (!refreshed) {
                        throw TOKEN_REFRESH_ERROR;
                    }
                } finally {
                    setRefreshState(false, null);
                }
            }

            response = await fetch(url, config);
        }

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = {
                    code: "UNKNOWN_ERROR" as ErrorCodeKey,
                    message: `HTTP ${response.status}: ${response.statusText}`,
                };
            }

            throw new ApiError(response.status, errorData.code, errorData.message);
        }

        if (response.status === 204) {
            return {} as T;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw toSafeApiError(error);
    }
}
