interface AppEnv {
    VITE_API_BASE_URL: string;
    VITE_WS_BASE_URL: string;
}

const env = import.meta.env as unknown as AppEnv;

export const ENV = {
    API_BASE_URL: env.VITE_API_BASE_URL || `invalid`, // 에러나게 아무 뻥값 넣었습니다.
    WS_BASE_URL: env.VITE_WS_BASE_URL || `invalid`,
} as const;
