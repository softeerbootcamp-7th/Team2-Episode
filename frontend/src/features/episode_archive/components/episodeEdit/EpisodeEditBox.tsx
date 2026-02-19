import { FormProvider } from "react-hook-form";

import EpisodeContentSection from "@/features/episode_archive/components/episodeEdit/EpisodeCotentSection";
import EpisodeInfoSection from "@/features/episode_archive/components/episodeEdit/EpisodeInfoSection";
import EpisodeMetaSection from "@/features/episode_archive/components/episodeEdit/EpisodeMetaSection";
import { useEpisodeEditForm } from "@/features/episode_archive/hooks/useEpisodeEditForm";
import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";

type EpisodeEditBoxProps = {
    initialData: EpisodeDetailResponse;
    onSave: (data: EpisodeDetailResponse) => void;
    onCancel: () => void;
};

export default function EpisodeEditBox({ initialData, onSave, onCancel }: EpisodeEditBoxProps) {
    const methods = useEpisodeEditForm(initialData);

    return (
        <FormProvider {...methods}>
            <form
                onSubmit={methods.handleSubmit(onSave)}
                /* EpisodeBar와 너비를 맞추기 위해 flex 구조 사용 */
                className="flex w-full items-stretch bg-gray-100 rounded-xl overflow-hidden shadow-none"
            >
                {/* 1. EPISODE 영역 (w-48) */}
                <EpisodeInfoSection className="w-48 p-6 shrink-0" />

                {/* 2. STAR 영역 (flex-1) */}
                <EpisodeContentSection className="flex-1 p-6 bg-white/50" />

                {/* 3. 역량 및 버튼 영역 (w-47 = w-32 + w-15) */}
                <EpisodeMetaSection className="w-47 p-6 shrink-0" onCancel={onCancel} />
            </form>
        </FormProvider>
    );
}
