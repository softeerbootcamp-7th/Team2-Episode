import { useEffect, useMemo, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import { User } from "@/features/auth/types/user";
import useApplyMindmapSnapshot from "@/features/mindmap/hooks/useApplyMindmapSnapshot";
import { useJoinMindmapSession } from "@/features/mindmap/hooks/useJoinMindmapSession";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

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

    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    const { status: snapshotApplyStatus, lastEntryId } = useApplyMindmapSnapshot({ doc, url: snapshotUrl });
    const { mutate: joinSession } = useJoinMindmapSession({ mindmapId });

    useEffect(() => {
        if (!mindmapId) return;
        setToken(null);
        setConnectionStatus("disconnected");
        setSnapshotUrl(null);
        setIsSynced(false);

        joinSession(mindmapId, {
            onSuccess: (data) => {
                setToken(data.token);
                setSnapshotUrl(data.presignedUrl);
            },
        });
    }, [mindmapId, joinSession]);

    useEffect(() => {
        if (!token || !mindmapId || snapshotApplyStatus !== "success") {
            return;
        }

        const wsProvider = new WebsocketProvider(`${ENV.WS_BASE_URL}/mindmap/`, mindmapId, doc, {
            disableBc: true,
            connect: true,
            params: { token, lastEntryId },
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
    }, [doc, mindmapId, token, snapshotApplyStatus]);

    return {
        doc,
        provider,
        connectionStatus,
        isSynced,
    };
}
