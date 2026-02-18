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
    mindmapId: string;
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
        if (!token) return undefined;

        return new WebsocketProvider(`${ENV.WS_BASE_URL}/mindmap/`, mindmapId, doc, {
            connect: false,
            params: { token },
        });
    }, [doc, mindmapId, token]);

    useEffect(() => {
        if (!provider) return;
        if (snapshotStatus === "loading") return;

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

                Y.applyUpdate(doc, update);

                const nodesMap = doc.getMap(mindmapId);

                const rootId = "root";

                if (nodesMap.has(rootId)) {
                    doc.transact(() => {
                        const nodesMap = doc.getMap<NodeElement>(mindmapId);

                        const patches = computeMindmapLayout({
                            nodes: new Map(nodesMap.entries()),
                            rootId: rootId,
                        });

                        for (const p of patches) {
                            const node = nodesMap.get(p.nodeId);
                            if (node) {
                                nodesMap.set(p.nodeId, {
                                    ...node,
                                    ...p.patch,
                                });
                            }
                        }
                    }, "layout-init");
                }

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

    const isLoading = !token || snapshotStatus === "loading";

    return {
        doc,
        provider,
        connectionStatus,
        snapshotStatus,
        isLoading,
    };
}
