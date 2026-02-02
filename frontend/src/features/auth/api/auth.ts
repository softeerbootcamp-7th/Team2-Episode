import { AUTH_LOGOUT_API } from "@/features/auth/api/api";
import { type ApiError, toSafeApiError } from "@/features/auth/types/api.types";
import { post } from "@/shared/api/method";

// 로그아웃
export const logout = async (): Promise<void | ApiError> => {
    try {
        await post<void, Record<string, never>>({ endpoint: AUTH_LOGOUT_API });
    } catch (error) {
        return toSafeApiError(error);
    }
};
