import { useEffect, useState } from "react";
import * as Y from "yjs";

import { BadRequestError } from "@/shared/utils/errors";

export type SnapshotStatus = "idle" | "loading" | "success" | "error";

type Props = {
    url: string | null;
    doc: Y.Doc;
};

const useApplyMindmapSnapshot = ({ url, doc }: Props) => {
    const [status, setStatus] = useState<SnapshotStatus>("idle");
    const [lastEntryId, setLastEntryId] = useState("0-0");

    useEffect(() => {
        if (!url || url === "" || !doc) {
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

                // 백엔드가 스냅샷 정상 반영을 위해 추가한 값이라 우리가 보내줘야 한다고 함.
                const lastEntryId = res.headers.get("X-Amz-Meta-Last-Entry-Id");
                setLastEntryId(lastEntryId ?? "0-0");

                Y.applyUpdate(doc, new Uint8Array(buffer));

                setStatus("success");
            } catch (e) {
                if (e instanceof Error && e.name === "AbortError") return;

                setStatus("error");
                throw new BadRequestError("마인드맵 스냅샷 반영에 실패했습니다.");
            }
        })();

        return () => {
            controller.abort();
        };
    }, [doc, url]);

    return { status, lastEntryId };
};

export default useApplyMindmapSnapshot;
