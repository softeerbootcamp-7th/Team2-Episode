import { useEffect } from "react";
import { useRouteError } from "react-router";

import GlobalErrorFallback from "@/shared/components/RootErrorBoundary/ErrorFallback";
import { BaseError } from "@/shared/utils/errors";

export default function RootErrorBoundary() {
    const error = useRouteError();

    const normalizedError =
        error instanceof Error
            ? error
            : new Error(typeof error === "string" ? error : "알 수 없는 오류가 발생했습니다.");

    useEffect(() => {
        if (normalizedError instanceof BaseError) {
            console.error(`[Error ${normalizedError.code}]: ${normalizedError.message}`);
        }
    }, [normalizedError]);

    return <GlobalErrorFallback error={normalizedError} resetErrorBoundary={() => window.location.reload()} />;
}
