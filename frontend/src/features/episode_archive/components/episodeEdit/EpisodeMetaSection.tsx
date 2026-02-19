import { useFormContext } from "react-hook-form";

import { CompetencyTag, EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import Button from "@/shared/components/button/Button";
import Chip from "@/shared/components/chip/Chip";
import { ALL_COMPETENCIES } from "@/shared/constants/competency";
import { cn } from "@/utils/cn";

interface EpisodeMetaSectionProps {
    className?: string;
    onCancel: () => void;
    isSubmitting?: boolean; // 저장 중 로딩 상태 추가
}

export default function EpisodeMetaSection({ className, onCancel, isSubmitting = false }: EpisodeMetaSectionProps) {
    const { watch, setValue } = useFormContext<EpisodeDetailResponse>();

    const selectedCompetencies = watch("competencyTypes") || [];

    const toggleTag = (competency: CompetencyTag) => {
        if (isSubmitting) return;

        const isSelected = selectedCompetencies.some((item) => item.id === competency.id);

        const nextCompetencies = isSelected
            ? selectedCompetencies.filter((item) => item.id !== competency.id)
            : [...selectedCompetencies, competency];

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
