import { ERROR_CODES, ErrorCodeKey } from "@/shared/constants/error";

/**
 * API 에러 응답
 */
export class ApiError extends Error {
    public readonly status: number;
    public readonly code: ErrorCodeKey;

    constructor(status: number, code: ErrorCodeKey, message: (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | string) {
        super(message);

        this.status = status;
        this.code = code;
        this.name = "ApiError";

        // Error 클래스 상속 시 프로토타입 체인 유지 필수
        Object.setPrototypeOf(this, ApiError.prototype);

        // V8 엔진 환경(Chrome, Node.js 등)에서 스택 트레이스 정리
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }
}
