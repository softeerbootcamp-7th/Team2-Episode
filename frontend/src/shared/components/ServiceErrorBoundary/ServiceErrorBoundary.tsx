// @/shared/components/ServiceErrorBoundary/ServiceErrorBoundary.tsx
import { ReactNode } from "react";
import { useRouteError } from "react-router";

import GlobalErrorFallback from "@/shared/components/ServiceErrorBoundary/ErrorFallback";

interface Props {
    children?: ReactNode; // children 추가
}

export default function ServiceErrorBoundary({ children }: Props) {
    const error = useRouteError();

    if (error) {
        if (error instanceof Response && error.status >= 300 && error.status < 400) {
            throw error;
        }

        const normalizedError =
            error instanceof Error ? error : new Error(typeof error === "string" ? error : "알 수 없는 오류");
        return <GlobalErrorFallback error={normalizedError} resetErrorBoundary={() => window.location.reload()} />;
    }

    return <>{children}</>;
}
