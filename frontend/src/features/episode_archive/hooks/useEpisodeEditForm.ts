import { useForm } from "react-hook-form";

import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";

/**
 * 에피소드 수정 폼을 관리하는 커스텀 훅입니다.
 * EpisodeDetailResponse 타입을 엄격하게 준수합니다.
 * * @param initialData - 에피소드 상세 정보 초기값 (MOCK 또는 API 응답 데이터)
 */
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
        // 실시간 유효성 검사가 필요한 경우 활성화 (선택 사항)
        mode: "onChange",
    });

    return methods;
};
