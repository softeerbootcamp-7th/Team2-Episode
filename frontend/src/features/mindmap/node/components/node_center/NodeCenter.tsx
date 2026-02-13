// NodeCenter.tsx
import AddNode from "@/features/mindmap/node/components/add_node/AddNode";
import { cn } from "@/utils/cn";

type NodeCenterProps = {
    username?: string;
    className?: string;
    children?: React.ReactNode;
};

const PRIMARY_COLOR = "violet";

export default function NodeCenter({ username = "", className, children }: NodeCenterProps) {
    const label = username ? `${username}의\n마인드맵` : "마인드맵";

    return (
        <div className={cn("group relative flex items-center gap-2 cursor-pointer", className)}>
            {/* 왼쪽 버튼: 항상 존재 */}
            <AddNode
                data-direction="left"
                data-action="add-child"
                color={PRIMARY_COLOR}
                direction="left"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto"
            />
            {children}

            {/* 중앙 원형 콘텐츠 */}
            <div className="text-center cursor-pointer w-40 bg-node-violet-op-100 rounded-full h-40 flex items-center justify-center text-white typo-body-16-semibold px-3 whitespace-pre-line">
                {label}
            </div>

            {/* 오른쪽 버튼: 항상 존재 */}
            <AddNode
                data-direction="right"
                data-action="add-child"
                color={PRIMARY_COLOR}
                direction="right"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto"
            />
        </div>
    );
}
