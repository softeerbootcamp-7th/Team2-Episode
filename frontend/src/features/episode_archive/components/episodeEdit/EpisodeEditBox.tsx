import { FormProvider } from "react-hook-form";

import EpisodeContentSection from "@/features/episode_archive/components/episodeEdit/EpisodeContentSection";
import EpisodeInfoSection from "@/features/episode_archive/components/episodeEdit/EpisodeInfoSection";
import EpisodeMetaSection from "@/features/episode_archive/components/episodeEdit/EpisodeMetaSection";
import { useEpisodeEditForm } from "@/features/episode_archive/hooks/useEpisodeEditForm";
import { useUpdateEpisode } from "@/features/episode_archive/hooks/useUpdateEpisode";
import { EpisodeDetailResponse, UpdateEpisodeRequest } from "@/features/episode_archive/types/episode";

type EpisodeEditBoxProps = {
    initialData: EpisodeDetailResponse;
    onCancel: () => void;
};

export default function EpisodeEditBox({ initialData, onCancel }: EpisodeEditBoxProps) {
    const methods = useEpisodeEditForm(initialData);
    const {
        handleSubmit,
        formState: { dirtyFields },
    } = methods;

    const { mutate: updateEpisode, isPending } = useUpdateEpisode(initialData.nodeId);

    const onSubmit = (formData: EpisodeDetailResponse) => {
        const requestBody: UpdateEpisodeRequest = {};

        const starFields: (keyof UpdateEpisodeRequest & keyof EpisodeDetailResponse)[] = [
            "situation",
            "task",
            "action",
            "result",
        ];

        starFields.forEach((field) => {
            if (dirtyFields[field]) {
                requestBody[field] = (formData[field] as string) || "";
            }
        });

        if (dirtyFields.competencyTypes) {
            requestBody.competencyTypeIds = (formData.competencyTypes ?? []).map((t) => t.id);
        }

        if (dirtyFields.startDate) requestBody.startDate = formData.startDate || "0000-00-00";
        if (dirtyFields.endDate) requestBody.endDate = formData.endDate || "0000-00-00";

        if (Object.keys(requestBody).length > 0) {
            updateEpisode(requestBody, { onSuccess: () => onCancel() });
        } else {
            onCancel();
        }
    };

    return (
        <FormProvider {...methods}>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex w-full h-full items-stretch bg-gray-100 rounded-xl overflow-hidden"
            >
                <EpisodeInfoSection className="w-48 p-6 shrink-0" />
                <EpisodeContentSection className="flex-1 p-6 bg-white/50" />
                <EpisodeMetaSection className="w-47 p-6 shrink-0" onCancel={onCancel} isSubmitting={isPending} />
            </form>
        </FormProvider>
    );
}
