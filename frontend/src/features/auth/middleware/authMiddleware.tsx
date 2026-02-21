import { redirect } from "react-router";

import { AUTH_QUERY_KEYS } from "@/features/auth/constants/query_key";
import { User } from "@/features/auth/types/user";
import { queryClient } from "@/shared/api/query_client";
import { linkTo } from "@/shared/utils/route";

export function authMiddleWare() {
    const user = queryClient.getQueryData<User>(AUTH_QUERY_KEYS.user);

    if (!user) {
        throw redirect(linkTo.home()); // LandingPage가 있는 루트로 이동
    }
}
