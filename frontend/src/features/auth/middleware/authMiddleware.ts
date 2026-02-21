import { redirect } from "react-router";

import { authQueryOptions } from "@/features/auth/api/auth";
import { queryClient } from "@/shared/api/query_client";
import { AUTH_MESSAGES } from "@/shared/constants/authMessage";
import { linkTo } from "@/shared/utils/route";

export async function authMiddleWare() {
    // ensureQueryData를 통해 새로고침 시에도 응답이 올 때까지 기다리기
    const user = await queryClient.ensureQueryData(authQueryOptions);

    if (!user) {
        throw redirect(`${linkTo.home()}?${AUTH_MESSAGES.AUTH_ERROR}=${AUTH_MESSAGES.LOGIN_REQUIRED}`);
    }
}
