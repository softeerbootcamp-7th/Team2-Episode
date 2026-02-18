import { useEffect, useMemo, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import { User } from "@/features/auth/types/user";
import { useJoinMindmapSession } from "@/features/mindmap/hooks/useJoinMindmapSession";
import { NodeElement } from "@/features/mindmap/types/node";
import { computeMindmapLayout } from "@/features/mindmap/utils/compute_mindmap_layout";

type ConnectionStatus = "disconnected" | "connecting" | "connected";
type SnapshotStatus = "idle" | "loading" | "success" | "error";

type Props = {
    mindmapId?: string;
    enableAwareness?: boolean;
    userInfo: User | null;
};

export function useMindmapSession({ mindmapId }: Props) {
    const doc = useMemo(() => new Y.Doc(), [mindmapId]);

    const [token, setToken] = useState<string | null>(null);
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

    const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus>("idle");
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    const { mutate: joinSession } = useJoinMindmapSession();

    useEffect(() => {
        if (!mindmapId) return;

        setToken(null);
        setSnapshotUrl(null);
        setSnapshotStatus("idle");
        setConnectionStatus("disconnected");

        joinSession(mindmapId, {
            onSuccess: (data) => {
                setToken(data.token);
                setSnapshotUrl(data.presignedUrl);
            },
            onError: () => setSnapshotStatus("error"),
        });
    }, [mindmapId, joinSession]);

    const provider = useMemo(() => {
        if (!token || !mindmapId) return undefined;

        return new WebsocketProvider(`${ENV.WS_BASE_URL}/mindmap/`, mindmapId, doc, {
            connect: false,
            params: { token },
        });
    }, [doc, mindmapId, token]);

    useEffect(() => {
        if (!provider) return;
        if (snapshotStatus !== "success") return;

        if (!provider.shouldConnect) provider.connect();

        const handleStatus = (event: { status: ConnectionStatus }) => setConnectionStatus(event.status);
        provider.on("status", handleStatus);

        return () => {
            provider.off("status", handleStatus);
            provider.disconnect();
        };
    }, [provider, snapshotStatus]);

    useEffect(() => {
        if (!snapshotUrl) return;

        let cancelled = false;

        (async () => {
            try {
                setSnapshotStatus("loading");
                const res = await fetch(snapshotUrl);
                if (!res.ok) throw new Error(`snapshot fetch failed: ${res.status}`);

                const buffer = await res.arrayBuffer();
                const update = new Uint8Array(buffer);

                if (cancelled) return;
                const tempDoc = new Y.Doc();
                Y.applyUpdate(tempDoc, update);

                // 2. JSON으로 변환하여 출력
                console.log("압축 해제된 스냅샷 데이터(JSON):", tempDoc.toJSON());
                Y.applyUpdate(doc, update);

                setSnapshotStatus("success");
            } catch (e) {
                console.error("💥 Snapshot Load/Layout Error:", e);
                if (!cancelled) setSnapshotStatus("error");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [doc, snapshotUrl, mindmapId]);

    const isLoading = !token || snapshotStatus !== "success";

    return {
        doc,
        provider,
        connectionStatus,
        snapshotStatus,
        isLoading,
    };
}
