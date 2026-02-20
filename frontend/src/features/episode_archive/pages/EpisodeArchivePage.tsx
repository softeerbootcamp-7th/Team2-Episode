import { Suspense } from "react";

import { EpisodeContent } from "@/features/episode_archive/components/EpisodeContent";
import EpisodeTitle from "@/features/episode_archive/components/EpisodeTitle";
import MaxWidth from "@/shared/components/max_width/MaxWidth";
import Spinner from "@/shared/components/spinner/Spinner";

export default function EpisodeArchivePage() {
    return (
        <MaxWidth maxWidth="lg" className="h-screen flex flex-col overflow-hidden">
            <div className="flex flex-col w-full gap-10 pt-10 pb-4 flex-1 overflow-hidden">
                <EpisodeTitle />
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center flex-1">
                            <Spinner />
                        </div>
                    }
                >
                    <EpisodeContent />
                </Suspense>
            </div>
        </MaxWidth>
    );
}
