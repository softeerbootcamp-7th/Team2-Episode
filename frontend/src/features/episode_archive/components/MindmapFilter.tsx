import { MindmapItem } from "@/features/mindmap/types/mindmap";
import Dropdown from "@/shared/components/dropdown/Dropdown";
import { cn } from "@/utils/cn";

type Props = {
    mindmapList: MindmapItem[];
    value: string; // 선택된 mindmapId
    onChange: (id: string) => void;
};

export default function MindmapFilter({ mindmapList, value, onChange }: Props) {
    // 현재 선택된 마인드맵의 이름 찾기
    const selectedLabel = mindmapList.find((m) => m.mindmapId === value)?.mindmapName || "전체 마인드맵";

    return (
        <div className="flex items-center gap-3 shrink-0 h-full">
            <span className="typo-body-14-semibold text-text-main2 whitespace-nowrap">마인드맵</span>
            <div className="w-60 h-full">
                <Dropdown
                    color="var(--color-text-main2)"
                    value={selectedLabel}
                    className={cn(
                        "flex items-center justify-between h-full w-full px-5 py-4",
                        "text-text-main2 typo-body-16-medium-160 tracking-[-0.32px]",
                    )}
                >
                    <ul className="flex flex-col py-2 border border-gray-200 rounded-xl shadow-lg bg-white overflow-hidden max-h-60 overflow-y-auto">
                        <li
                            onClick={() => onChange("")}
                            className="px-4 py-2.5 typo-body-16-medium-160 cursor-pointer hover:bg-gray-50 text-gray-700"
                        >
                            전체 마인드맵
                        </li>
                        {mindmapList.map((mindmap) => (
                            <li
                                key={mindmap.mindmapId}
                                onClick={() => onChange(mindmap.mindmapId)}
                                className={cn(
                                    "px-4 py-2.5 typo-body-16-medium-160 cursor-pointer transition-colors hover:bg-gray-50",
                                    value === mindmap.mindmapId ? "text-primary bg-primary-50" : "text-gray-700",
                                )}
                            >
                                {mindmap.mindmapName}
                            </li>
                        ))}
                    </ul>
                </Dropdown>
            </div>
        </div>
    );
}
