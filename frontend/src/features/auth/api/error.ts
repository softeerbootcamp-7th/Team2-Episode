import { ApiError } from "@/features/auth/types/api";
import { ERROR_CODES } from "@/shared/constants/error";

/**
 * ApiError 타입 가드
 */
export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}

/**
 * 어떤 형태의 에러든 안전하게 ApiError 인스턴스로 변환
 */
export function toSafeApiError(error: unknown): ApiError {
    if (isApiError(error)) {
        return error;
    }

    if (error instanceof Error) {
        return new ApiError(500, "UNKNOWN_ERROR", ERROR_CODES.UNKNOWN_ERROR);
    }

    return new ApiError(500, "UNKNOWN_ERROR", "알 수 없는 오류가 발생했습니다.");
}
