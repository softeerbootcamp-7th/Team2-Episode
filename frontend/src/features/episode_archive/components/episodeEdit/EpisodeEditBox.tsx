/** @/features/episode_archive/components/episodeEdit/EpisodeEditBox.tsx */
import { FormProvider } from "react-hook-form";

import EpisodeContentSection from "@/features/episode_archive/components/episodeEdit/EpisodeCotentSection";
import EpisodeInfoSection from "@/features/episode_archive/components/episodeEdit/EpisodeInfoSection"; // ✅ 정본 경로
import EpisodeMetaSection from "@/features/episode_archive/components/episodeEdit/EpisodeMetaSection";
import { useEpisodeEditForm } from "@/features/episode_archive/hooks/useEpisodeEditForm";
import { useUpdateEpisode } from "@/features/episode_archive/hooks/useUpdateEpisode";
import { EpisodeDetailResponse, UpdateEpisodeRequest } from "@/features/episode_archive/types/episode";

export default function EpisodeEditBox({
    initialData,
    onCancel,
}: {
    initialData: EpisodeDetailResponse;
    onCancel: () => void;
}) {
    const methods = useEpisodeEditForm(initialData);

    const {
        handleSubmit,
        formState: { dirtyFields },
    } = methods;
    const { mutate: updateEpisode, isPending } = useUpdateEpisode(initialData.nodeId);

    const onSubmit = (formData: EpisodeDetailResponse) => {
        const requestBody: UpdateEpisodeRequest = {};

        if (dirtyFields.situation) requestBody.situation = formData.situation || "";
        if (dirtyFields.task) requestBody.task = formData.task || "";
        if (dirtyFields.action) requestBody.action = formData.action || "";
        if (dirtyFields.result) requestBody.result = formData.result || "";
        if (dirtyFields.content) requestBody.content = formData.content || "";

        if (dirtyFields.competencyTypes) {
            requestBody.competencyTypeIds = (formData.competencyTypes ?? []).map((t) => t.id);
        }

        if (dirtyFields.startDate) {
            requestBody.startDate = { present: !!formData.startDate, undefined: !formData.startDate };
        }
        if (dirtyFields.endDate) {
            requestBody.endDate = { present: !!formData.endDate, undefined: !formData.endDate };
        }

        if (Object.keys(requestBody).length > 0) {
            updateEpisode(requestBody, { onSuccess: () => onCancel() });
        } else {
            onCancel();
        }
    };

    return (
        // ✅ 반드시 Provider가 form/섹션을 감싸야 함
        <FormProvider {...methods}>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex w-full items-stretch bg-gray-100 rounded-xl overflow-hidden"
            >
                <EpisodeInfoSection className="w-48 p-6 shrink-0" />
                <EpisodeContentSection className="flex-1 p-6 bg-white/50" />
                <EpisodeMetaSection className="w-47 p-6 shrink-0" onCancel={onCancel} isSubmitting={isPending} />
            </form>
        </FormProvider>
    );
}
