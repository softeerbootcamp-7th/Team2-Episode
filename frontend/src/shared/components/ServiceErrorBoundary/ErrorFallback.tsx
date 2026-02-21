import Button from "@/shared/components/button/Button";
import { BaseError } from "@/shared/utils/errors";

export default function GlobalErrorFallback({
    error,
    resetErrorBoundary,
}: {
    error: Error;
    resetErrorBoundary: () => void;
}) {
    const isBaseError = error instanceof BaseError;
    const message = isBaseError ? error.message : "예상치 못한 오류가 발생했습니다.";

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-white">
            <h1 className="typo-title-28-bold text-text-main1 mb-4">문제가 발생했습니다</h1>
            <p className="typo-body-16-medium text-text-main2 mb-10 whitespace-pre-wrap">{message}</p>
            <div className="flex gap-4 w-full max-w-xs">
                <Button variant="secondary" layout="fullWidth" onClick={() => (window.location.href = "/")}>
                    홈으로 이동
                </Button>
                <Button variant="primary" layout="fullWidth" onClick={resetErrorBoundary}>
                    다시 시도
                </Button>
            </div>
        </div>
    );
}
