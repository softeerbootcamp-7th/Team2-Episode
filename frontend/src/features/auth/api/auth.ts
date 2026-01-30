import type { ApiError, LoginRequest, LoginResponse } from "@/features/auth/types/api.types";
import { post } from "@/shared/api/method";

export const AUTH_API = "/api/auth";
export const AUTH_REFRESH_API = `${AUTH_API}/refresh`;
export const AUTH_LOGOUT_API = `${AUTH_API}/logout`;
export const AUTH_LOGIN_API = `${AUTH_API}/login`;
export const AUTH_CALLBACK_API = `${AUTH_API}/callback`;

// 로그아웃
export const logout = async (): Promise<void | ApiError> => {
    try {
        await post<void, {}>({ endpoint: AUTH_LOGOUT_API });
    } catch (error) {
        return error as ApiError;
    }
};

// 로그인 (카카오 인가코드 전달)
export const login = async (data: LoginRequest): Promise<LoginResponse | ApiError> => {
    try {
        return await post<LoginResponse, LoginRequest>({ endpoint: AUTH_LOGIN_API, data });
    } catch (error) {
        return error as ApiError;
    }
};
