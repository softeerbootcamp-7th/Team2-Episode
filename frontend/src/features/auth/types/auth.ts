/**
 * 사용자 인터페이스
 */
export type User = {
    userId: number;
    nickname: string;
};

/**
 *  인증 상태 인터페이스
 *  AuthProvider에서 관리하는 전역 상태
 */
export type AuthState = {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
};

/**
 * 카카오 로그인 API
 */
export type LoginRequest = {
    code: string;
};

export type LoginResponse = {
    user: User;
};

/**
 * 인증 상태 확인 API
 */
export type AuthCheckResponse = {
    isAuthenticated: boolean;
    userId: number | null;
    nickname: string | null;
};

/**
 * API 에러 응답
 */
export type ApiError = {
    status: number;
    code: string;
    message: string;
};

/**
 * AuthContext 값 타입
 */
export interface AuthContextValue {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

/**
 * 유틸리티: AuthCheckResponse를 User로 반환
 */
export function authCheckResponseToUser(response: AuthCheckResponse): User | null {
    if (!response.isAuthenticated) {
        return null;
    }
    return {
        userId: response.userId!,
        nickname: response.nickname!,
    };
}
