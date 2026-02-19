import { cva } from "class-variance-authority";

import { cn } from "@/utils/cn";

const barItemVariants = cva(
    "flex items-center justify-center h-10 typo-body-14-semibold text-gray-800 leading-[140%] tracking-[-0.28px]",
    {
        variants: {
            variant: {
                episode: "w-48 bg-node-blue-op-20 rounded-xl",
                content: "flex-1 bg-node-blue-op-5 border-r border-node-blue-op-15 last:border-none",
                empty: "w-15 bg-node-blue-op-5",
            },
        },
        defaultVariants: {
            variant: "content",
        },
    },
);

export default function EpisodeBar() {
    return (
        <div className="flex w-full gap-2 mb-2">
            <div className={barItemVariants({ variant: "episode" })}>EPISODE</div>

            <div className="flex flex-1 rounded-xl overflow-hidden border-node-blue-op-15">
                <div className={barItemVariants()}>SITUATION</div>
                <div className={barItemVariants()}>TASK</div>
                <div className={barItemVariants()}>ACTION</div>
                <div className={barItemVariants()}>RESULT</div>

                <div className={cn(barItemVariants(), "flex-none w-32")}>역량</div>
                <div className={barItemVariants({ variant: "empty" })} />
            </div>
        </div>
    );
}
