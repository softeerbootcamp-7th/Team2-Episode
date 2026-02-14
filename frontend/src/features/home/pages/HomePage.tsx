import { Link, Outlet } from "react-router";

import { useAuth } from "@/features/auth/hooks/useAuth";
import Button from "@/shared/components/button/Button";
import GlobalNavigationBar from "@/shared/components/global_navigation_bar/GlobalNavigationBar";
import Popover from "@/shared/components/popover/Popover";
import UserBox from "@/shared/components/user_box/UserBox";
import { linkTo } from "@/shared/utils/route";

const HomePage = () => {
    const { user, logout } = useAuth();

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <GlobalNavigationBar
                rightSlot={
                    user ? (
                        <Popover
                            direction="bottom_left"
                            contents={
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="bg-white border border-gray-200 rounded-lg px-4 py-2 typo-body-14-medium text-text-main2 shadow-md"
                                >
                                    로그아웃
                                </button>
                            }
                        >
                            <UserBox name={user.nickname} />
                        </Popover>
                    ) : (
                        <Link to={linkTo.login()}>
                            <Button size="xs" variant="quaternary_accent_outlined">
                                로그인
                            </Button>
                        </Link>
                    )
                }
            />

            <main className="flex-1 flex flex-col relative w-full overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default HomePage;
