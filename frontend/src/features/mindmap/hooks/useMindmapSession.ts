import { useEffect, useMemo, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import { User } from "@/features/auth/types/user";
import { useJoinMindmapSession } from "@/features/mindmap/hooks/useJoinMindmapSession";

type ConnectionStatus = "disconnected" | "connecting" | "connected";
type SnapshotStatus = "idle" | "loading" | "success" | "error";

type Props = {
    mindmapId: string;
    enableAwareness?: boolean;
    userInfo: User | null;
};

export function useMindmapSession({ mindmapId }: Props) {
    const doc = useMemo(() => new Y.Doc(), [mindmapId]);
    const [provider, setProvider] = useState<WebsocketProvider | undefined>(undefined);

    const [isSynced, setIsSynced] = useState(false);

    const [token, setToken] = useState<string | null>(null);
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

    const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus>("idle");
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    const { mutate: joinSession } = useJoinMindmapSession({ mindmapId });

    useEffect(() => {
        if (!mindmapId) return;
        setToken(null);
        setSnapshotUrl(null);
        setSnapshotStatus("idle");
        setConnectionStatus("disconnected");
        setIsSynced(false);

        joinSession(mindmapId, {
            onSuccess: (data) => {
                setToken(data.token);
                setSnapshotUrl(data.presignedUrl);
            },
            onError: () => setSnapshotStatus("error"),
        });
    }, [mindmapId, joinSession]);

    useEffect(() => {
        if (!snapshotUrl) return;
        let active = true;

        (async () => {
            try {
                setSnapshotStatus("loading");
                const res = await fetch(snapshotUrl);
                const buffer = await res.arrayBuffer();
                if (!active) return;

                Y.applyUpdate(doc, new Uint8Array(buffer));
                setSnapshotStatus("success");
            } catch (e) {
                console.error("Snapshot load failed", e);
                setSnapshotStatus("error");
            }
        })();

        return () => {
            active = false;
        };
    }, [doc, snapshotUrl]);

    useEffect(() => {
        if (!token || !mindmapId || snapshotStatus !== "success") return;

        const wsProvider = new WebsocketProvider(`${ENV.WS_BASE_URL}/mindmap/`, mindmapId, doc, {
            disableBc: true,
            connect: true,
            params: { token },
            resyncInterval: 20000,
        });

        const handleStatus = (event: { status: ConnectionStatus }) => {
            setConnectionStatus(event.status);
        };

        wsProvider.on("sync", (synced: boolean) => {
            console.log(`🔄 Sync status changed: ${synced}`);
            setIsSynced(synced);

            if (synced) {
                console.log("🎉 서버와 데이터 동기화 완료! 현재 진짜 Doc 상태:");
                console.log(doc.getMap(mindmapId).toJSON());
            }
        });

        wsProvider.on("status", handleStatus);

        setProvider(wsProvider);

        return () => {
            wsProvider.off("status", handleStatus);
            wsProvider.disconnect();
            wsProvider.destroy();
            setProvider(undefined);
            setIsSynced(false);
        };
    }, [doc, mindmapId, token, snapshotStatus]);

    return {
        doc,
        provider,
        connectionStatus,
        snapshotStatus,
        isSynced,
    };
}
