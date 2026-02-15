import MindmapTypeCard from "@/features/mindmap/components/MindmapTypeCard";
import { CreateMindmapFunnel } from "@/features/mindmap/types/mindmap_funnel";
import BottomSticky from "@/shared/components/bottom_sticky/BottomSticky";
import Button from "@/shared/components/button/Button";
import Top from "@/shared/components/top/Top";
import { FunnelInstance } from "@/shared/hooks/useFunnel";

type TypeStepFunnel = Extract<FunnelInstance<CreateMindmapFunnel>, { step: "TYPE" }>;

const MINDMAP_TYPES = [
    {
        id: "PRIVATE" as const,
        icon: "ic_user" as const,
        title: "개인 마인드맵",
        description: "나만 사용할 수 있는 마인드맵이에요.\n개인 경험 정리와 자기소개서 준비에 적합해요.",
    },
    {
        id: "PUBLIC" as const,
        icon: "ic_team" as const,
        title: "팀 마인드맵",
        description: "함께 사용하는 마인드맵이에요.\n프로젝트를 진행한 팀원들과 경험을 정리할 수 있어요.",
    },
] as const;

export function MindmapTypeStep({ funnel }: { funnel: TypeStepFunnel }) {
    const selectedType = funnel.context.mindmapType;

    return (
        <>
            <div className="flex-1">
                <Top
                    lowerGap="lg"
                    title={<h1 className="typo-title-20-bold text-text-main1">어떤 마인드맵을 만들까요?</h1>}
                    lower={
                        <p className="typo-body-16-medium text-text-main2">
                            사용 목적에 따라 알맞는 마인드맵 유형을 선택해 주세요.
                        </p>
                    }
                />

                <div className="flex w-full gap-6 mb-12">
                    {MINDMAP_TYPES.map((type) => (
                        <MindmapTypeCard
                            key={type.id}
                            icon={type.icon}
                            title={type.title}
                            description={type.description}
                            isSelected={selectedType === type.id}
                            onClick={() => funnel.history.setContext({ mindmapType: type.id })}
                        />
                    ))}
                </div>
            </div>

            <BottomSticky>
                <Button
                    size="md"
                    variant="primary"
                    disabled={!selectedType}
                    onClick={() => {
                        if (selectedType === "PUBLIC") {
                            funnel.history.push("TEAM_DETAIL", { mindmapType: "PUBLIC", episodes: ["", "", ""] });
                        } else {
                            funnel.history.push("CATEGORY", { mindmapType: "PRIVATE" });
                        }
                    }}
                >
                    마인드맵 만들기
                </Button>
            </BottomSticky>
        </>
    );
}
