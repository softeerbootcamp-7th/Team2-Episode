import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { logout as logoutApi } from "@/features/auth/api/auth";
import { AUTH_QUERY_KEYS } from "@/features/auth/constants/query_key";
import { AuthContext } from "@/features/auth/hooks/useAuth";
import type { User } from "@/features/auth/types/user";
import { USER_ME_ENDPOINT } from "@/shared/api/api";
import { get } from "@/shared/api/method";

type AuthProviderProps = {
    children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const queryClient = useQueryClient();

    const { data: user, isLoading } = useQuery({
        queryKey: [AUTH_QUERY_KEYS.user],
        queryFn: async () =>
            get<User>({
                endpoint: USER_ME_ENDPOINT,
                options: { skipRefresh: false },
            }),
        staleTime: 1000 * 60 * 4,
        retry: false,
    });

    const login = async (newUser: User): Promise<void> => {
        queryClient.setQueryData([AUTH_QUERY_KEYS.user], newUser);
    };

    const logoutMutation = useMutation({
        mutationFn: async () => logoutApi(),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: [AUTH_QUERY_KEYS.user] });
        },
    });

    const isAuthenticated = !!user && !logoutMutation.isPending;

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user: user || null,
                isLoading,
                login,
                logout: logoutMutation.mutateAsync,
                checkAuth: () => queryClient.refetchQueries({ queryKey: [AUTH_QUERY_KEYS.user] }),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
