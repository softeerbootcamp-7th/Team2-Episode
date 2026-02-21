export const AUTH_MESSAGES = {
    LOGIN_REQUIRED: "login_required",
    LOGOUT: "logout",
    UNAUTHORIZED: "unauthorized",
    AUTH_ERROR: "auth_error",
} as const;

export const AUTH_TOAST_MAP: Record<string, string> = {
    [AUTH_MESSAGES.LOGIN_REQUIRED]: "로그인이 필요한 화면입니다.",
    [AUTH_MESSAGES.LOGOUT]: "로그아웃 되었습니다.",
};
