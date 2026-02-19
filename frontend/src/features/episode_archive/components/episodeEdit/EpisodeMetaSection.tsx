import { useFormContext } from "react-hook-form";

import { competencyType, EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import Button from "@/shared/components/button/Button";
import Chip from "@/shared/components/chip/Chip";
import { cn } from "@/utils/cn";

// 1. 고정된 역량 리스트 (id를 number로 수정하여 타입 일치)
const ALL_COMPETENCIES: competencyType[] = [
    { id: 1, category: "공통", competencyType: "팀워크" },
    { id: 2, category: "공통", competencyType: "협업" },
    { id: 3, category: "공통", competencyType: "문제해결" },
    { id: 4, category: "공통", competencyType: "리더십" },
    { id: 5, category: "공통", competencyType: "의사소통" },
    { id: 6, category: "공통", competencyType: "기획력" },
    { id: 7, category: "공통", competencyType: "창의성" },
    { id: 8, category: "공통", competencyType: "적응력" },
];

export default function EpisodeMetaSection({ className, onCancel }: { className?: string; onCancel: () => void }) {
    const { watch, setValue } = useFormContext<EpisodeDetailResponse>();

    // 2. competencyTypes 배열의 타입을 명시적으로 가져옴
    const selectedCompetencies = watch("competencyTypes") || [];

    const toggleTag = (competency: competencyType) => {
        // id 비교 시 타입 충돌 해결 (number === number)
        const isSelected = selectedCompetencies.some((item) => item.id === competency.id);

        const nextCompetencies = isSelected
            ? selectedCompetencies.filter((item) => item.id !== competency.id)
            : [...selectedCompetencies, competency];

        // 3. setValue 시 타입 안정성 확보
        setValue("competencyTypes", nextCompetencies, { shouldValidate: true });
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
                            >
                                {item.competencyType}
                            </Chip>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
                <Button type="submit" variant="primary" layout="fullWidth" className="py-3 rounded-xl">
                    저장하기
                </Button>
                <Button
                    type="button"
                    variant="basic"
                    layout="fullWidth"
                    onClick={onCancel}
                    className="py-3 rounded-xl bg-gray-200 text-gray-800"
                >
                    취소하기
                </Button>
            </div>
        </div>
    );
}
