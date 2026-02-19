import { useForm } from "react-hook-form";

import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";

export const useEpisodeEditForm = (initialData: EpisodeDetailResponse) => {
    const methods = useForm<EpisodeDetailResponse>({
        // 초기값 설정
        defaultValues: {
            nodeId: initialData.nodeId,
            startDate: initialData.startDate,
            endDate: initialData.endDate,
            content: initialData.content,
            situation: initialData.situation,
            task: initialData.task,
            action: initialData.action,
            result: initialData.result,
            competencyTypes: initialData.competencyTypes,
        },
        mode: "onChange",
    });

    return methods;
};
