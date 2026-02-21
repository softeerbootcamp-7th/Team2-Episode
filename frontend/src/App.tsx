import {
    createBrowserRouter,
    isRouteErrorResponse,
    Outlet,
    RouterProvider,
    useLocation,
    useRouteError,
} from "react-router";

import { authProtectedRouteMiddleware } from "@/features/auth/middleware/authProtectedRoutedMiddleware";
import { AuthProvider } from "@/features/auth/providers/AuthProvider";
import EpisodeArchivePage from "@/features/episode_archive/pages/EpisodeArchivePage";
import HomePage from "@/features/home/pages/HomePage";
import CreateMindmapFunnelPage from "@/features/mindmap/pages/CreateMindmapPage";
import MindmapDetailPage from "@/features/mindmap/pages/MindmapDetailPage";
import MindmapListPage from "@/features/mindmap/pages/MindmapListPage";
import LoginPage from "@/features/user/login/pages/LoginPage";
import GlobalNavigationBar from "@/shared/components/global_navigation_bar/GlobalNavigationBar";
import { Toaster } from "@/shared/components/ui/sonner";
import { PATHS } from "@/shared/utils/route";
import { cn } from "@/utils/cn";

function RootLayout() {
    const location = useLocation();
    const isLandingView = location.pathname === PATHS.home;

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <header className={isLandingView ? "fixed top-0 left-0 right-0 z-50" : "relative z-50 shrink-0"}>
                <GlobalNavigationBar variant={isLandingView ? "transparent" : "white"} />
            </header>

            <main className={cn("w-full", isLandingView ? "h-full" : "flex-1 overflow-hidden")}>
                <Outlet />
            </main>
        </div>
    );
}

const router = createBrowserRouter([
    {
        element: (
            <AuthProvider>
                <RootLayout />
            </AuthProvider>
        ),
        errorElement: <RootErrorBoundary />,
        children: [
            {
                path: "/",
                element: <HomePage />,
            },
            {
                // 로그인 필수 경로 그룹
                middleware: [authProtectedRouteMiddleware],
                children: [
                    { path: PATHS.mindmap.list, element: <MindmapListPage /> },
                    { path: PATHS.episode_archive, element: <EpisodeArchivePage /> },
                    { path: PATHS.mindmap.create, element: <CreateMindmapFunnelPage /> },
                    { path: PATHS.mindmap.detail, element: <MindmapDetailPage /> },
                ],
            },
        ],
    },
    {
        path: PATHS.login,
        element: <LoginPage />,
    },
]);

function App() {
    return (
        <>
            <Toaster position="top-center" duration={2000} />
            <RouterProvider router={router}></RouterProvider>
        </>
    );
}

export default App;

function RootErrorBoundary() {
    const error = useRouteError();

    return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
            <h1 className="text-2xl font-bold mb-2">문제가 발생했습니다! 😢</h1>
            <p className="text-muted-foreground mb-4">
                {isRouteErrorResponse(error)
                    ? `${error.status} ${error.statusText}`
                    : error instanceof Error
                      ? error.message
                      : "알 수 없는 에러가 발생했습니다."}
            </p>
            <button onClick={() => (window.location.href = "/")} className="px-4 py-2 bg-primary text-white rounded-md">
                홈으로 돌아가기
            </button>
        </div>
    );
}
