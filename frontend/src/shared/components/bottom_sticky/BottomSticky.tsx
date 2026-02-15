import { ReactNode } from "react";

interface BottomStickyProps {
    children: ReactNode;
    className?: string;
}

const BottomSticky = ({ children, className = "" }: BottomStickyProps) => {
    return (
        <div className="sticky bottom-0 w-full bg-white">
            <div className={`w-full pb-12.5 pt-4 ${className}`}>{children}</div>
        </div>
    );
};

export default BottomSticky;
