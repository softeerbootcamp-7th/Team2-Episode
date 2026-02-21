import MindmapCard from "@/features/mindmap/components/list/MindmapCard";
import { useMindmapList } from "@/features/mindmap/hooks/useMindmapList";
import { MindmapTabId } from "@/features/mindmap/types/mindmap";

type Props = {
    mindmapType: MindmapTabId;
};

const MindmapList = ({ mindmapType }: Props) => {
    const { data: mindmapList } = useMindmapList({ type: mindmapType });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {mindmapList.map((mindmap) => (
                <MindmapCard key={mindmap.mindmapId} data={mindmap} />
            ))}

            {mindmapList.length === 0 && (
                <div className="col-span-full py-20 text-center text-text-sub1">해당하는 마인드맵이 없습니다.</div>
            )}
        </div>
    );
};

export default MindmapList;
