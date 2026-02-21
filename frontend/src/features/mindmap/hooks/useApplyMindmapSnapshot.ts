import { useEffect, useState } from "react";
import * as Y from "yjs";

import { BadRequestError } from "@/shared/utils/errors";

export type SnapshotStatus = "idle" | "loading" | "success" | "error";

type Props = {
    url?: string;
    doc: Y.Doc;
};

const useApplyMindmapSnapshot = ({ url, doc }: Props) => {
    const [status, setStatus] = useState<SnapshotStatus>("idle");

    useEffect(() => {
        if (!url) {
            setStatus("idle");
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                setStatus("loading");
                const res = await fetch(url, { signal: controller.signal });

                if (!res.ok) throw new Error("Fetch failed");

                const buffer = await res.arrayBuffer();

                Y.applyUpdate(doc, new Uint8Array(buffer));

                setStatus("success");
            } catch (e) {
                if (e instanceof Error && e.name === "AbortError") return;

                setStatus("error");
                throw new BadRequestError("마인드맵 스냅샷 반영에 ");
            }
        })();

        return () => {
            controller.abort();
        };
    }, [doc, url]);

    return { status };
};

export default useApplyMindmapSnapshot;
