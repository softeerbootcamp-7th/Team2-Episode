import EpisodeItem from "@/features/episode_archive/components/EpisodeContainer/EpisodeItem";
import { useClearEpisode } from "@/features/episode_archive/hooks/useClearEpisode";
import { EpisodeDetail } from "@/features/episode_archive/types/episode";
import Chip from "@/shared/components/chip/Chip";
import Icon from "@/shared/components/icon/Icon";

type EpisodeStarProps = {
    detail: EpisodeDetail;
    onEditClick: () => void;
    searchTerm?: string;
};

const ICON_COLOR = "var(--color-text-placeholder)";

export default function EpisodeStar({ detail, onEditClick, searchTerm }: EpisodeStarProps) {
    const { mutate: clearEpisode, isPending } = useClearEpisode(detail.nodeId);
    const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onEditClick();
    };

    const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        if (isPending) return;

        if (window.confirm("에피소드의 모든 내용(STAR, 태그, 날짜)이 초기화됩니다. 계속하시겠습니까?")) {
            clearEpisode();
        }
    };

    return (
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_8rem_3.75rem] w-full h-full items-stretch bg-white">
            <EpisodeItem highlightTerm={searchTerm}>{detail.situation}</EpisodeItem>
            <EpisodeItem highlightTerm={searchTerm}>{detail.task}</EpisodeItem>
            <EpisodeItem highlightTerm={searchTerm}>{detail.action}</EpisodeItem>
            <EpisodeItem highlightTerm={searchTerm}>{detail.result}</EpisodeItem>

            <div className="flex flex-wrap gap-1 content-start p-4 border-r border-gray-100">
                {detail.competencyTypes.map((type) => (
                    <Chip key={type.id} as="span" variant="basic" size="sm">
                        {type.competencyType}
                    </Chip>
                ))}
            </div>

            <div className="flex flex-col items-center justify-start gap-4 p-4">
                <button onClick={handleEditClick} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
                    <Icon name="ic_nodemenu_edit" color={ICON_COLOR} size={20} />
                </button>
                <button onClick={handleDeleteClick} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
                    <Icon name="ic_nodemenu_delete" color={ICON_COLOR} size={20} />
                </button>
            </div>
        </div>
    );
}
