import EpisodeItem from "@/features/episode_archive/components/episodeContainer/EpisodeItem";
import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import Chip from "@/shared/components/chip/Chip";
import Icon from "@/shared/components/icon/Icon";

type Props = {
    detail: EpisodeDetailResponse;
};

export default function EpisodeStar({ detail }: Props) {
    const iconColor = "var(--color-text-placeholder)";

    return (
        /**
         * EpisodeBar의 flex-1 내부 구조와 일치시킴:
         * 1fr 1fr 1fr 1fr (STAR) | w-32 (역량) | w-15 (아이콘 영역)
         */
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_8rem_3.75rem] w-full h-full items-stretch bg-white">
            {/* 1fr 영역 (SITUATION, TASK, ACTION, RESULT) */}
            <EpisodeItem>{detail.situation}</EpisodeItem>
            <EpisodeItem>{detail.task}</EpisodeItem>
            <EpisodeItem>{detail.action}</EpisodeItem>
            <EpisodeItem>{detail.result}</EpisodeItem>

            {/* w-32 영역 (역량) - 8rem */}
            <div className="flex flex-wrap gap-1 p-4 items-start justify-start border-r border-gray-100">
                {detail.competencyTypes.map((type) => (
                    <Chip key={type.id} as="span" variant="basic" size="sm">
                        {type.competencyType}
                    </Chip>
                ))}
            </div>

            {/* w-15 영역 (아이콘/Empty 대응) - 3.75rem */}
            <div className="flex flex-col items-start justify-start gap-4 p-4">
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <Icon name="ic_nodemenu_edit" color={iconColor} size={20} />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <Icon name="ic_nodemenu_delete" color={iconColor} size={20} />
                </button>
            </div>
        </div>
    );
}
