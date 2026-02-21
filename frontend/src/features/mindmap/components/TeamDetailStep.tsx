import { useMemo } from "react";

import { useInitializeMindmap } from "@/features/mindmap/hooks/useInitializeMindmap";
import { CreateMindmapFunnel } from "@/features/mindmap/types/mindmap_funnel";
import BottomSticky from "@/shared/components/bottom_sticky/BottomSticky";
import Button from "@/shared/components/button/Button";
import Input from "@/shared/components/Input/Input";
import Top from "@/shared/components/top/Top";
import { FunnelInstance } from "@/shared/hooks/useFunnel";
import { linkTo } from "@/shared/utils/route";

type TeamDetailStepFunnel = Extract<FunnelInstance<CreateMindmapFunnel>, { step: "TEAM_DETAIL" }>;

function TextField(props: {
    label: string;
    required?: boolean;
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
}) {
    const { label, required, value, placeholder, onChange } = props;

    return (
        <div className="flex flex-col gap-2">
            <label className="typo-body-14-medium text-text-sub1">
                {label} {required ? <span className="text-red-500">*</span> : null}
            </label>
            <Input inputSize="sm" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}

function DashedAddButton(props: { onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={props.onClick}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 py-4 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 transition"
        >
            <span className="typo-body-16-medium text-text-placeholder">＋</span>
            <span className="typo-body-16-medium text-text-placeholder">{props.label}</span>
        </button>
    );
}

export function TeamDetailStep({ funnel }: { funnel: TeamDetailStepFunnel }) {
    const { initialize, isPending } = useInitializeMindmap((mindmapId) => {
        funnel.exit(linkTo.mindmap.detail(mindmapId));
    });

    const projectName = funnel.context.projectName ?? "";
    const episodes = funnel.context.episodes ?? [];

    const updateProjectName = (nextName: string) => funnel.history.setContext({ projectName: nextName });
    const updateEpisode = (index: number, nextEpisode: string) => {
        funnel.history.setContext((prev) => {
            const next = [...(prev.episodes || [])];
            next[index] = nextEpisode;
            return { ...prev, episodes: next };
        });
    };

    const addEpisode = () => {
        funnel.history.setContext((prev) => ({ ...prev, episodes: [...(prev.episodes || []), ""] }));
    };

    const cleanedEpisodes = useMemo(
        () => episodes.map((item) => item.trim()).filter((item) => item !== ""),
        [episodes],
    );

    const canNext = projectName.trim().length > 0 && cleanedEpisodes.length > 0;

    const handleSubmit = () => {
        initialize({ title: projectName, isShared: true, items: cleanedEpisodes });
    };

    return (
        <>
            <div className="flex flex-col flex-1 w-full overflow-hidden">
                <div className="flex-none flex flex-col">
                    <Top
                        lowerGap="lg"
                        title={
                            <h1 className="typo-title-28-bold text-text-main1 leading-snug">
                                팀 마인드맵을 시작해볼까요?
                            </h1>
                        }
                        lower={
                            <p className="typo-body-16-medium text-text-main2">
                                프로젝트 이름과 함께, 정리할 경험을 입력해 주세요.
                            </p>
                        }
                        className="mb-12"
                    />
                    <div className="pb-4">
                        <TextField
                            label="프로젝트 이름"
                            required
                            value={projectName}
                            placeholder="프로젝트 이름을 입력해 주세요"
                            onChange={updateProjectName}
                        />
                    </div>

                    <div className="typo-body-14-medium text-text-main2">정리할 에피소드</div>
                </div>

                <div className="flex-1 overflow-y-auto pb-32 min-h-0 basis-0">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-4">
                            {episodes.map((ep, idx) => (
                                <div key={idx} className="flex flex-col gap-2">
                                    <div className="typo-body-14-medium text-text-sub2">에피소드 {idx + 1}</div>
                                    <Input
                                        inputSize="sm"
                                        value={ep}
                                        onChange={(e) => updateEpisode(idx, e.target.value)}
                                        placeholder="에피소드 제목을 입력해 주세요"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-2">
                            <DashedAddButton onClick={addEpisode} label="에피소드 추가" />
                        </div>
                    </div>
                </div>
            </div>

            <BottomSticky>
                <Button
                    size="md"
                    variant="primary"
                    layout="fullWidth"
                    disabled={!canNext || isPending}
                    onClick={handleSubmit}
                >
                    {isPending ? "생성 중..." : "마인드맵 만들기"}
                </Button>
            </BottomSticky>
        </>
    );
}
