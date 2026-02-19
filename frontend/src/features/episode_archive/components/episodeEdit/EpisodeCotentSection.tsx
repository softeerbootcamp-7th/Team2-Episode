import { useFormContext } from "react-hook-form";

import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";
import Row from "@/shared/components/row/Row";
import { placeHolder } from "@/shared/constants/placeholder";
import { cn } from "@/utils/cn";

type FieldId = keyof EpisodeDetailResponse;

interface FieldConfig {
    id: FieldId;
    label: string;
    english: string;
    char: "S" | "T" | "A" | "R";
}

export default function EpisodeContentSection({ className }: { className?: string }) {
    const { register } = useFormContext<EpisodeDetailResponse>();

    const fields: FieldConfig[] = [
        { id: "situation", label: "상황", english: "Situation", char: "S" },
        { id: "task", label: "과제", english: "Task", char: "T" },
        { id: "action", label: "행동", english: "Action", char: "A" },
        { id: "result", label: "결과", english: "Result", char: "R" },
    ];

    const handleResizeHeight = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
    };

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            {fields.map((field) => (
                <div key={field.id} className="flex flex-col gap-2">
                    <Row
                        className="list-none"
                        leftSlot={
                            <div className="flex flex-row gap-2 items-center">
                                <div
                                    className="flex flex-col justify-center items-center rounded-full bg-primary w-5.5 h-5.5"
                                    style={{ padding: "1.8px 6.4px" }}
                                >
                                    <span className="text-white text-xs font-bold leading-none">{field.char}</span>
                                </div>
                                <span className="typo-body-16-semibold text-text-main1">{field.label}</span>
                                <span className="typo-body-14-reg text-text-placeholder">{field.english}</span>
                            </div>
                        }
                    />

                    {/* w-full로 변경하여 비율에 맞춰 자동 조절되게 함 */}
                    <div className="flex w-full min-h-30 px-5 pt-4 pb-3.5 items-start gap-2.5 rounded-xl border border-gray-300 bg-white shadow-none">
                        <textarea
                            {...register(field.id)}
                            onInput={handleResizeHeight}
                            placeholder={placeHolder.STAR[field.char]}
                            className="
        w-full
        typo-body-14-reg
        text-text-main1
        border-none
        outline-none
        resize-none
        overflow-hidden
        p-0

        placeholder:text-text-placeholder
        placeholder:font-normal
        placeholder:text-14
        placeholder:leading-[140%]
        placeholder:tracking-[-0.28px]
    "
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
