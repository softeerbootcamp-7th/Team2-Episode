import { useAuth } from "@/features/auth/hooks/useAuth";
import { useInitializeMindmap } from "@/features/mindmap/engine/useInitializeMindmap";
import { ACTIVITY_CATEGORIES, ActivityCategory } from "@/features/mindmap/types/mindmap";
import { CreateMindmapFunnel } from "@/features/mindmap/types/mindmap_funnel";
import BottomSticky from "@/shared/components/bottom_sticky/BottomSticky";
import Button from "@/shared/components/button/Button";
import { EmojiCard } from "@/shared/components/emoji_card/EmojiCard";
import Top from "@/shared/components/top/Top";
import { FunnelInstance } from "@/shared/hooks/useFunnel";
import { linkTo } from "@/shared/utils/route";

type CategoryStepFunnel = Extract<FunnelInstance<CreateMindmapFunnel>, { step: "CATEGORY" }>;

export function MindmapCategoryStep({ funnel }: { funnel: CategoryStepFunnel }) {
    const { initialize, isPending } = useInitializeMindmap(() => {
        // TODO: 임시로 메인으로 보냄
        funnel.exit(linkTo.mindmap.list(), { replace: false });
    });

    const selected = funnel.context.categories ?? [];

    const toggle = (id: ActivityCategory) => {
        funnel.history.setContext((prev) => {
            const prevSelected = prev.categories ?? [];
            const next = prevSelected.includes(id) ? prevSelected.filter((x) => x !== id) : [...prevSelected, id];
            return { ...prev, categories: next };
        });
    };

    const canSubmit = selected.length > 0;

    const { user } = useAuth();

    const handleSubmit = () => {
        initialize({ title: `${user?.nickname ?? "아무개"}의 마인드맵`, isShared: false, items: selected });
    };

    return (
        <>
            <div className="flex flex-col flex-1 w-full">
                <Top
                    lowerGap="lg"
                    title={
                        <h1 className="typo-title-28-bold text-text-main1 leading-snug">
                            마인드맵으로 정리할 <br /> 활동 카테고리를 선택하세요.
                        </h1>
                    }
                    lower={
                        <p className="text-text-main2 typo-body-16-medium">
                            사용 목적에 따라 알맞는 마인드맵 유형을 선택해 주세요.
                        </p>
                    }
                    className="mb-12"
                />

                <div className="grid grid-cols-2 gap-4 pb-10">
                    {ACTIVITY_CATEGORIES.map((c) => (
                        <EmojiCard
                            key={c.id}
                            emoji={c.emoji}
                            label={c.label}
                            selected={selected.includes(c.id)}
                            onClick={() => toggle(c.id)}
                        />
                    ))}
                </div>
            </div>

            <BottomSticky>
                <Button
                    size="md"
                    variant="primary"
                    layout="fullWidth"
                    disabled={!canSubmit || isPending}
                    onClick={handleSubmit}
                >
                    {isPending ? "생성 중..." : "완료"}
                </Button>
            </BottomSticky>
        </>
    );
}
