import { ERROR_CODES, ErrorCode } from "@/shared/constants/error";

/**
 * API 에러 응답
 */
export class ApiError extends Error {
    public readonly status: number;
    public readonly code: ErrorCode;

    constructor(status: number, code: ErrorCode, message: (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | string) {
        super(message);

        this.status = status;
        this.code = code;
        this.name = "ApiError";
    }
}
