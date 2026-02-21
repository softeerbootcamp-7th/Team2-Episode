import { createBrowserRouter, Outlet, RouterProvider, useLocation } from "react-router";

import { authProtectedRouteMiddleware } from "@/features/auth/middleware/authProtectedRoutedMiddleware";
import { AuthProvider } from "@/features/auth/providers/AuthProvider";
import EpisodeArchivePage from "@/features/episode_archive/pages/EpisodeArchivePage";
import HomePage from "@/features/home/pages/HomePage";
import CreateMindmapFunnelPage from "@/features/mindmap/pages/CreateMindmapPage";
import MindmapDetailPage from "@/features/mindmap/pages/MindmapDetailPage";
import MindmapListPage from "@/features/mindmap/pages/MindmapListPage";
import LoginPage from "@/features/user/login/pages/LoginPage";
import GlobalNavigationBar from "@/shared/components/global_navigation_bar/GlobalNavigationBar";
import ServiceErrorBoundary from "@/shared/components/ServiceErrorBoundary/ServiceErrorBoundary";
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
        errorElement: <ServiceErrorBoundary />,
        children: [
            {
                path: "/",
                element: <HomePage />,
            },
            {
                errorElement: <ServiceErrorBoundary />,

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
