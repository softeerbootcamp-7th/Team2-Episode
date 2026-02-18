interface AppEnv {
    VITE_API_BASE_URL: string;
    VITE_WS_BASE_URL: string;
    MODE: "development" | "production" | string;
    DEV: boolean;
    PROD: boolean;
}

const env = import.meta.env as unknown as AppEnv;

export const ENV = {
    API_BASE_URL: env.VITE_API_BASE_URL || "invalid",
    WS_BASE_URL: env.VITE_WS_BASE_URL || "invalid",
    MODE: env.MODE,
    IS_DEV: env.DEV,
    IS_PROD: env.PROD,
} as const;
