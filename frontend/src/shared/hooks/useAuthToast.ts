import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { AUTH_MESSAGES, AUTH_TOAST_MAP } from "@/shared/constants/authMessage";

export function useAuthToast() {
    const [searchParams, setSearchParams] = useSearchParams();
    const isToastRendered = useRef(false); // toast 2번 뜨지 않게

    useEffect(() => {
        const authError = searchParams.get(AUTH_MESSAGES.AUTH_ERROR);

        // 1. 파라미터가 없거나 이미 띄웠다면 즉시 중단
        if (!authError || isToastRendered.current) return;

        // 2. 토스트 실행
        toast.error(AUTH_TOAST_MAP[authError]);

        // 3. 실행 직후 플래그 true 설정 (중복 차단막 설치)
        isToastRendered.current = true;

        // 4. URL 청소
        const newParams = new URLSearchParams(searchParams);
        newParams.delete(AUTH_MESSAGES.AUTH_ERROR);
        setSearchParams(newParams, { replace: true });
    }, [searchParams]);
}
