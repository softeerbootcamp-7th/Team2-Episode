import EpisodeItem from "@/features/episode_archive/components/episodeContainer/EpisodeItem";
import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import Chip from "@/shared/components/chip/Chip";
import Icon from "@/shared/components/icon/Icon";

type Props = {
    detail: EpisodeDetailResponse;
    onEditClick: () => void; // 수정 모드 진입 콜백
};

const iconColor = "var(--color-text-placeholder)";

export default function EpisodeStar({ detail, onEditClick }: Props) {
    const handleButtonClick = (e: React.MouseEvent) => {
        console.log("✅ [Star] 수정 버튼 클   릭됨");
        // 이벤트 버블링(부모로 클릭이 퍼지는 현상)을 막기 위해 추가
        e.stopPropagation();
        onEditClick();
    };

    return (
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_8rem_3.75rem] w-full h-full items-stretch bg-white">
            <EpisodeItem>{detail.situation}</EpisodeItem>
            <EpisodeItem>{detail.task}</EpisodeItem>
            <EpisodeItem>{detail.action}</EpisodeItem>
            <EpisodeItem>{detail.result}</EpisodeItem>

            <div className="flex flex-wrap gap-1 content-start p-4 items-start justify-start border-r border-gray-100">
                {detail.competencyTypes.map((type) => (
                    <Chip key={type.id} as="span" variant="basic" size="sm">
                        {type.competencyType}
                    </Chip>
                ))}
            </div>

            <div className="flex flex-col items-start justify-start gap-4 p-4">
                <button onClick={handleButtonClick} className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <Icon name="ic_nodemenu_edit" color={iconColor} size={20} />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <Icon name="ic_nodemenu_delete" color={iconColor} size={20} />
                </button>
            </div>
        </div>
    );
}
