import { ENV } from "@/constants/env";
import { ApiError } from "@/features/auth/types/api";
import { ERROR_CODES, ErrorCode } from "@/shared/constants/error";

type ErrorStatus = number;
type ErrorMessage = (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | string;
type ErrorDisplayType = "replace" | "alert";

type BaseErrorParams = {
    status: ErrorStatus;
    code: ErrorCode;
    message: ErrorMessage;
    isFatal: boolean;
    displayType: ErrorDisplayType;
};

export class BaseError extends ApiError {
    public message: ErrorMessage;
    public code: ErrorCode;
    public status: ErrorStatus;
    public isFatal: boolean;
    public displayType: ErrorDisplayType;

    constructor({ isFatal = false, displayType = "alert", status, code, message }: BaseErrorParams) {
        super(status, code, message);

        this.message = ENV.IS_PROD ? message : `${message} (코드, 로직에 문제가 없는지 검토해주세요.)`;
        this.code = code;
        this.status = status;
        this.isFatal = isFatal;
        this.displayType = displayType;

        this.name = new.target.name;
    }
}

/** 400: 잘못된 요청 */
export class BadRequestError extends BaseError {
    constructor(message: ErrorMessage = "잘못된 요청입니다.") {
        super({
            status: 400,
            code: "INVALID_REQUEST",
            message,
            isFatal: false,
            displayType: "replace",
        });
    }
}

/** 401: 인증 필요 */
export class UnauthorizedError extends BaseError {
    constructor(message: ErrorMessage = "사용자 인증이 필요합니다.") {
        super({
            status: 401,
            code: "UNAUTHORIZED",
            message,
            isFatal: false,
            displayType: "alert",
        });
    }
}

/** 404: 리소스 없음 */
export class NotFoundError extends BaseError {
    constructor(message: ErrorMessage = "요청하신 리소스를 찾을 수 없습니다.") {
        super({
            status: 404,
            code: "NOT_FOUND",
            message,
            isFatal: true,
            displayType: "replace",
        });
    }
}

/** 500: 서버 내부 오류 */
export class InternalServerError extends BaseError {
    constructor(message: ErrorMessage = "서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요.") {
        super({
            status: 500,
            code: "INTERNAL_ERROR",
            message,
            isFatal: true,
            displayType: "replace",
        });
    }
}

// /** Network: 오프라인 혹은 타임아웃 */
// export class NetworkError extends BaseError {
//     constructor(message: ErrorMessage = "네트워크 연결이 원활하지 않습니다.") {
//         super({
//             status: 0, // 네트워크 에러는 HTTP 상태 코드가 없음
//             code: "NETWORK_ERROR",
//             message,
//             isFatal: true,
//             displayType: "alert",
//         });
//     }
// }
