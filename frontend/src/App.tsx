import { createBrowserRouter, Outlet, RouterProvider } from "react-router";

import { authMiddleWare } from "@/features/auth/middleware/auth_middleware";
import { AuthProvider } from "@/features/auth/providers/AuthProvider";
import EpisodeArchivePage from "@/features/episode_archive/pages/EpisodeArchivePage";
import HomePage from "@/features/home/pages/HomePage";
import LandingPage from "@/features/landing/pages/LandingPage";
import CreateMindmapFunnelPage from "@/features/mindmap/pages/CreateMindmapPage";
import MindmapListPage from "@/features/mindmap/pages/MindmapListPage";
import MindmapPage from "@/features/mindmap/pages/MindmapPage";
import SelfDiagnosisPage from "@/features/self_diagnosis/pages/SelfDiagnosisPage";
import LoginPage from "@/features/user/login/pages/LoginPage";
import { Toaster } from "@/shared/components/ui/sonner";
import { PATHS } from "@/shared/utils/route";

function RootLayout() {
    return (
        <AuthProvider>
            <Outlet />
        </AuthProvider>
    );
}

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                element: <HomePage />,
                middleware: [authMiddleWare],
                children: [
                    {
                        index: true,
                        element: <MindmapListPage />,
                    },
                    {
                        path: PATHS.mindmap.list,
                        element: <MindmapListPage />,
                    },
                    {
                        path: PATHS.episode_archive,
                        element: <EpisodeArchivePage />,
                    },
                    {
                        path: PATHS.self_diagnosis.list,
                        element: <SelfDiagnosisPage />,
                    },
                    {
                        path: PATHS.mindmap.create,
                        element: <CreateMindmapFunnelPage />,
                    },
                    {
                        path: PATHS.mindmap.detail,
                        element: <MindmapPage />,
                    },
                ],
            },
            {
                path: PATHS.landing,
                element: <LandingPage />,
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
