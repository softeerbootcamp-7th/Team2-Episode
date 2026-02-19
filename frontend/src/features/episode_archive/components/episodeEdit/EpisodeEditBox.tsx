/** @/features/episode_archive/components/episodeEdit/EpisodeEditBox.tsx */
import { FormProvider } from "react-hook-form";

import EpisodeContentSection from "@/features/episode_archive/components/episodeEdit/EpisodeCotentSection";
import EpisodeMetaSection from "@/features/episode_archive/components/episodeEdit/EpisodeMetaSection";
import { useEpisodeEditForm } from "@/features/episode_archive/hooks/useEpisodeEditForm";
import { useUpdateEpisode } from "@/features/episode_archive/hooks/useUpdateEpisode";
import { EpisodeDetailResponse, UpdateEpisodeRequest } from "@/features/episode_archive/types/episode";
import EpisodeInfoSection from "@/shared/components/popover/EpisodeInfoSection";

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
    } = methods; // 수정된 필드 확인용
    const { mutate: updateEpisode, isPending } = useUpdateEpisode(initialData.nodeId);

    const onSubmit = (formData: EpisodeDetailResponse) => {
        const requestBody: UpdateEpisodeRequest = {};

        // 수정된 필드만 선별하여 전송 객체 구성
        if (dirtyFields.situation) requestBody.situation = formData.situation || "";
        if (dirtyFields.task) requestBody.task = formData.task || "";
        if (dirtyFields.action) requestBody.action = formData.action || "";
        if (dirtyFields.result) requestBody.result = formData.result || "";
        if (dirtyFields.content) requestBody.content = formData.content || "";

        // 역량 태그 수정 시 ID 배열로 변환
        if (dirtyFields.competencyTypes) {
            requestBody.competencyTypeIds = formData.competencyTypes.map((t) => t.id);
        }

        // 날짜 수정 시 명세서의 객체 구조 적용
        if (dirtyFields.startDate) {
            requestBody.startDate = {
                present: !!formData.startDate,
                undefined: !formData.startDate,
            };
        }
        if (dirtyFields.endDate) {
            requestBody.endDate = {
                present: !!formData.endDate,
                undefined: !formData.endDate,
            };
        }

        // 변경사항이 있을 때만 PATCH 요청 전송
        if (Object.keys(requestBody).length > 0) {
            updateEpisode(requestBody, {
                onSuccess: () => onCancel(), // 성공 시 수정 모드 종료
            });
        } else {
            onCancel(); // 변경 사항 없으면 API 호출 없이 닫기
        }
    };

    return (
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
