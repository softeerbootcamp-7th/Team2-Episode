import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { logout as logoutApi } from "@/features/auth/api/auth";
import { AUTH_QUERY_KEYS } from "@/features/auth/constants/query_key";
import { AuthContext } from "@/features/auth/hooks/useAuth";
import type { User } from "@/features/auth/types/user";
import { USER_ME_ENDPOINT } from "@/shared/api/api";
import { get } from "@/shared/api/method";
import { linkTo } from "@/shared/utils/route";

type AuthProviderProps = {
    children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: user } = useSuspenseQuery<User | null>({
        queryKey: AUTH_QUERY_KEYS.user,
        queryFn: async () => {
            try {
                return await get<User>({
                    endpoint: USER_ME_ENDPOINT,
                    options: { skipRefresh: false },
                });
            } catch {
                // 401 에러 등 비로그인 상태일 때는 null을 반환하여 정상 흐름으로 유도
                return null;
            }
        },
        staleTime: 1000 * 60 * 4,
        retry: false,
    });

    const login = async (newUser: User): Promise<void> => {
        queryClient.setQueryData(AUTH_QUERY_KEYS.user, newUser);
    };

    const logoutMutation = useMutation({
        mutationFn: async () => logoutApi(),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.user });
            navigate(linkTo.home(), { replace: true }); // 뒤로 가기 히스토리 제어, 보호 라우트는 middleware가 막아 landing으로 튕김
        },
    });

    const isAuthenticated = !!user && !logoutMutation.isPending;

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user: user || null,
                isLoading: false,
                login,
                logout: logoutMutation.mutateAsync,
                checkAuth: () => queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEYS.user }),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
