import { cva } from "class-variance-authority";
import { Link, useLocation } from "react-router";

import { useAuth } from "@/features/auth/hooks/useAuth";
import Button from "@/shared/components/button/Button";
import Icon from "@/shared/components/icon/Icon";
import Popover from "@/shared/components/popover/Popover";
import UserBox from "@/shared/components/user_box/UserBox";
import { linkTo } from "@/shared/utils/route";
import { cn } from "@/utils/cn";

type Props = {
    variant?: "white" | "transparent";
    className?: string;
};

export default function GlobalNavigationBar({ variant = "white", className }: Props) {
    const { user, isLoading, logout } = useAuth();
    const isAuthed = !!user;
    const location = useLocation();

    const isPathActive = (path: string) => location.pathname.includes(path);

    return (
        <div className={cn(variants({ variant }), className)}>
            <Link to="/">
                <Icon name="ic_logo" viewBox="0 0 87 16" height="1rem" width="5.4375rem" />
            </Link>

            <div className="flex flex-row gap-1 flex-1">
                {!isLoading && isAuthed && (
                    <>
                        <Link to={linkTo.mindmap.list()}>
                            <Button size="sm" variant={isPathActive(linkTo.mindmap.list()) ? "tertiary" : "ghost"}>
                                마인드맵
                            </Button>
                        </Link>
                        <Link to={linkTo.episode_archive()}>
                            <Button size="sm" variant={isPathActive(linkTo.episode_archive()) ? "tertiary" : "ghost"}>
                                에피소드 보관함
                            </Button>
                        </Link>
                    </>
                )}
            </div>

            <div className="flex items-center gap-2">
                {!isLoading &&
                    (isAuthed ? (
                        <Popover
                            direction="bottom_left"
                            contents={
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2 typo-body-14-medium text-text-main2 shadow-md"
                                >
                                    로그아웃
                                </button>
                            }
                        >
                            <UserBox name={user.nickname} />
                        </Popover>
                    ) : (
                        <Link to={linkTo.login()}>
                            <Button size="xs" borderRadius="md" variant="quaternary_accent_outlined">
                                시작하기
                            </Button>
                        </Link>
                    ))}
            </div>
        </div>
    );
}

const variants = cva("w-full h-18.5 border-b py-4 px-9 flex flex-row items-center gap-10", {
    variants: {
        variant: {
            white: "bg-white border-gray-300",
            transparent: "bg-white/20 border-white/30 backdrop-blur-xs",
        },
    },
});
