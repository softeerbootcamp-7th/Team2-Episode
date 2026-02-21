// @/shared/components/ServiceErrorBoundary/ServiceErrorBoundary.tsx
import { ReactNode } from "react";
import { useRouteError } from "react-router";

import GlobalErrorFallback from "@/shared/components/ServiceErrorBoundary/ErrorFallback";

interface Props {
    children?: ReactNode; // children 추가
}

export default function ServiceErrorBoundary({ children }: Props) {
    const error = useRouteError();

    // 1. 에러가 발생한 경우 (errorElement로서 동작)
    if (error) {
        const normalizedError =
            error instanceof Error
                ? error
                : new Error(typeof error === "string" ? error : "알 수 없는 오류가 발생했습니다.");

        return <GlobalErrorFallback error={normalizedError} resetErrorBoundary={() => window.location.reload()} />;
    }

    // 2. 에러가 없는 경우 (정상적인 Wrapper로서 동작)
    return <>{children}</>;
}
