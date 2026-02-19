import EpisodeItem from "@/features/episode_archive/components/episodeContainer/EpisodeItem";
import { EpisodeDetail } from "@/features/episode_archive/types/episode";
import Chip from "@/shared/components/chip/Chip";
import Icon from "@/shared/components/icon/Icon";

type EpisodeStarProps = {
    detail: EpisodeDetail;
    onEditClick: () => void;
};

const ICON_COLOR = "var(--color-text-placeholder)";

export default function EpisodeStar({ detail, onEditClick }: EpisodeStarProps) {
    const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onEditClick();
    };

    return (
        /* grid 너비 고정: 8rem(역량), 3.75rem(버튼) */
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_8rem_3.75rem] w-full h-full items-stretch bg-white">
            <EpisodeItem>{detail.situation}</EpisodeItem>
            <EpisodeItem>{detail.task}</EpisodeItem>
            <EpisodeItem>{detail.action}</EpisodeItem>
            <EpisodeItem>{detail.result}</EpisodeItem>

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
                <button className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
                    <Icon name="ic_nodemenu_delete" color={ICON_COLOR} size={20} />
                </button>
            </div>
        </div>
    );
}
