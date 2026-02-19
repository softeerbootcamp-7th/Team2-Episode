import { useEffect, useRef, useState } from "react";

import { MOCK_EPISODE_DETAILS } from "@/features/episode_archive/data";
import { EpisodeDetailResponse } from "@/features/episode_archive/types/episode";

export function useLazyDetail(nodeId: string, initialDetail: EpisodeDetailResponse | null) {
    const [detail, setDetail] = useState<EpisodeDetailResponse | null>(initialDetail);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && !detail) {
                    const data = MOCK_EPISODE_DETAILS[nodeId] ?? null;
                    setDetail(data);
                    observer.disconnect();
                }
            },
            { rootMargin: "300px" },
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [nodeId, detail]);

    return { detail, setDetail, ref };
}
