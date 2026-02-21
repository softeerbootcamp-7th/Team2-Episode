import type { User } from "@/features/auth/types/user";
import { fetchWithAuth } from "@/shared/api/client";

type UnknownRecord = Record<string, unknown>; // 🧩

const isRecord = (value: unknown): value is UnknownRecord => {
    return typeof value === "object" && value !== null;
};

const getErrorStatus = (error: unknown): number | null => {
    if (!isRecord(error)) return null;

    const status = error.status;
    if (typeof status === "number") return status;

    const statusCode = error.statusCode;
    if (typeof statusCode === "number") return statusCode;

    return null;
};

export const fetchMeOrNull = async (): Promise<User | null> => {
    try {
        const user = await fetchWithAuth<User>("/me");
        return user;
    } catch (error: unknown) {
        const status = getErrorStatus(error);

        if (status === 401) return null;

        throw error;
    }
};
