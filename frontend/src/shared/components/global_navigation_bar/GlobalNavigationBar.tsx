import { cva } from "class-variance-authority";
import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import Button from "@/shared/components/button/Button";
import Icon from "@/shared/components/icon/Icon";
import { linkTo } from "@/shared/utils/route";
import { cn } from "@/utils/cn";

type Props = {
    rightSlot?: ReactNode;
    variant?: "white" | "transparent";
    className?: string;
};

export default function GlobalNavigationBar({ variant = "white", rightSlot, className }: Props) {
    const navigate = useNavigate();
    const location = useLocation();

    const includePath = (targetPath: string) => {
        return location.pathname.includes(targetPath);
    };

    return (
        <div className={cn(variants({ variant }), className)}>
            <Link to="/">
                <Icon name="ic_logo" viewBox="0 0 87 16" height="16px" width="87px" />
            </Link>
            <div className="flex flex-row gap-1 flex-1">
                <Button
                    size="sm"
                    onClick={() => navigate(linkTo.mindmap.list())}
                    variant={includePath(linkTo.mindmap.list()) ? "tertiary" : "ghost"}
                >
                    마인드맵
                </Button>
                <Button
                    size="sm"
                    onClick={() => navigate(linkTo.episode_archive())}
                    variant={includePath(linkTo.episode_archive()) ? "tertiary" : "ghost"}
                >
                    에피소드 보관함
                </Button>
            </div>

            {rightSlot}
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
