// @/features/auth/middleware/authProtectedRoutedMiddleware.ts
import { redirect } from "react-router";

import { AUTH_QUERY_KEYS } from "@/features/auth/constants/query_key";
import { User } from "@/features/auth/types/user";
import { USER_ME_ENDPOINT } from "@/shared/api/api";
import { get } from "@/shared/api/method";
import { queryClient } from "@/shared/api/query_client";
import { linkTo } from "@/shared/utils/route";

export async function authMiddleWare() {
    try {
        // 1. 캐시가 있으면 쓰고, 없으면 fetch 합니다. (새로고침 시 여기서 대기)
        const user = await queryClient.ensureQueryData<User | null>({
            queryKey: AUTH_QUERY_KEYS.user,
            queryFn: () => get<User>({ endpoint: USER_ME_ENDPOINT }),
        });

        // 2. 결과가 null이거나 없으면 그제서야 리다이렉트
        if (!user) {
            throw redirect(linkTo.home());
        }
    } catch (error: unknown) {
        // 리다이렉트 응답은 에러가 아니므로 그대로 던져서 라우터가 처리하게 함
        if (error instanceof Response) throw error;

        // 401 에러가 발생했다면 홈으로 리다이렉트
        throw redirect(linkTo.home());
    }
}
