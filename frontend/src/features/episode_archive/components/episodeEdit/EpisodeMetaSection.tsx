import { useFormContext } from "react-hook-form";

import { CompetencyTag, EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import Button from "@/shared/components/button/Button";
import Chip from "@/shared/components/chip/Chip";
import { cn } from "@/utils/cn";

// 1. 고정된 역량 리스트 (타입명을 CompetencyTag로 업데이트)
const ALL_COMPETENCIES: CompetencyTag[] = [
    { id: 1, category: "공통", competencyType: "팀워크" },
    { id: 2, category: "공통", competencyType: "협업" },
    { id: 3, category: "공통", competencyType: "문제해결" },
    { id: 4, category: "공통", competencyType: "리더십" },
    { id: 5, category: "공통", competencyType: "의사소통" },
    { id: 6, category: "공통", competencyType: "기획력" },
    { id: 7, category: "공통", competencyType: "창의성" },
    { id: 8, category: "공통", competencyType: "적응력" },
];

interface EpisodeMetaSectionProps {
    className?: string;
    onCancel: () => void;
    isSubmitting?: boolean; // 저장 중 로딩 상태 추가
}

export default function EpisodeMetaSection({ className, onCancel, isSubmitting = false }: EpisodeMetaSectionProps) {
    const { watch, setValue } = useFormContext<EpisodeDetailResponse>();

    // 2. 선택된 역량 모니터링
    const selectedCompetencies = watch("competencyTypes") || [];

    const toggleTag = (competency: CompetencyTag) => {
        // 저장 중에는 수정을 막음
        if (isSubmitting) return;

        const isSelected = selectedCompetencies.some((item) => item.id === competency.id);

        const nextCompetencies = isSelected
            ? selectedCompetencies.filter((item) => item.id !== competency.id)
            : [...selectedCompetencies, competency];

        /** * 3. shouldDirty: true가 핵심입니다.
         * 이 값이 있어야 폼 제출 시 dirtyFields가 역량 태그 변경을 감지합니다.
         */
        setValue("competencyTypes", nextCompetencies, {
            shouldValidate: true,
            shouldDirty: true,
        });
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="flex-1 overflow-y-auto">
                <h3 className="typo-body-14-semibold text-text-main1 mb-4">역량 태그</h3>
                <div className="flex flex-wrap gap-2">
                    {ALL_COMPETENCIES.map((item) => {
                        const isSelected = selectedCompetencies.some((selected) => selected.id === item.id);
                        return (
                            <Chip
                                key={item.id}
                                as="button"
                                type="button"
                                onClick={() => toggleTag(item)}
                                variant={isSelected ? "tertiary_outlined" : "quaternary"}
                                size="md"
                                className={cn(isSubmitting && "cursor-not-allowed opacity-50")}
                            >
                                {item.competencyType}
                            </Chip>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
                {/* 4. 저장 버튼 로딩 및 비활성화 처리 */}
                <Button
                    type="submit"
                    variant="primary"
                    layout="fullWidth"
                    className="py-3 rounded-xl"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "저장 중..." : "저장하기"}
                </Button>
                <Button
                    type="button"
                    variant="basic"
                    layout="fullWidth"
                    onClick={onCancel}
                    className="py-3 rounded-xl bg-gray-200 text-gray-800"
                    disabled={isSubmitting}
                >
                    취소하기
                </Button>
            </div>
        </div>
    );
}
