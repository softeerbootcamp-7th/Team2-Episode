import { redirect } from "react-router";
import { toast } from "sonner";

import { AUTH_QUERY_KEYS } from "@/features/auth/constants/query_key";
import { User } from "@/features/auth/types/user";
import { queryClient } from "@/shared/api/query_client";
import { linkTo } from "@/shared/utils/route";

export function authProtectedRouteMiddleware() {
    const user = queryClient.getQueryData<User>(AUTH_QUERY_KEYS.user);

    if (!user) {
        toast.error("로그인이 필요합니다."); // sonner 등 토스트 라이브러리
        throw redirect(linkTo.home()); // LandingPage가 있는 루트로 이동
    }
}
