import { useEffect, useMemo, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import { User } from "@/features/auth/types/user";
import { useJoinMindmapSession } from "@/features/mindmap/hooks/useJoinMindmapSession";

type ConnectionStatus = "disconnected" | "connecting" | "connected";
type SnapshotStatus = "idle" | "loading" | "success" | "error";

type Props = {
    mindmapId?: string;
    enableAwareness?: boolean;
    userInfo: User | null;
};

export function useMindmapSession({ mindmapId }: Props) {
    // 1. Doc은 ID가 바뀌지 않는 한 유지
    const doc = useMemo(() => new Y.Doc(), [mindmapId]);

    // 2. Provider는 State로 관리 (Ref도 가능하지만, 연결 상태 렌더링을 위해 State 추천)
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

    const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus>("idle");
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    const { mutate: joinSession } = useJoinMindmapSession();

    // 1. 세션 참여 요청 (Token & Snapshot URL 획득)
    useEffect(() => {
        if (!mindmapId) return;

        // 초기화
        setToken(null);
        setSnapshotUrl(null);
        setSnapshotStatus("idle");
        setConnectionStatus("disconnected");
        setIsInitialized(false);

        joinSession(mindmapId, {
            onSuccess: (data) => {
                setToken(data.token);
                setSnapshotUrl(data.presignedUrl);
            },
            onError: () => setSnapshotStatus("error"),
        });
    }, [mindmapId, joinSession]);

    // 2. 스냅샷 로드 (Provider 연결 전 데이터 채우기)
    useEffect(() => {
        if (!snapshotUrl) return;

        let active = true;

        (async () => {
            try {
                setSnapshotStatus("loading");
                const res = await fetch(snapshotUrl);
                const buffer = await res.arrayBuffer();

                if (!active) return; // 언마운트 시 중단

                Y.applyUpdate(doc, new Uint8Array(buffer)); // 초기 데이터 주입
                console.log(doc.getMap(mindmapId).toJSON());

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

    // 3. Provider 생성 및 연결 (핵심 수정 파트)
    useEffect(() => {
        // 토큰이 없거나, 스냅샷 로드가 끝나지 않았으면 연결하지 않음
        if (!token || !mindmapId || snapshotStatus !== "success") return;

        console.log(`🔌 Provider 생성 시작: ${mindmapId}`);

        // ✅ connect: true로 설정하여 생성 즉시 연결 시도 (스냅샷이 이미 로드되었으므로 안전)
        const wsProvider = new WebsocketProvider(`${ENV.WS_BASE_URL}/mindmap/`, mindmapId, doc, {
            connect: true, // 여기서 바로 연결
            params: { token },
        });

        // 이벤트 핸들러 등록
        const handleStatus = (event: { status: ConnectionStatus }) => {
            console.log(`📡 연결 상태 변경: ${event.status}`);
            setConnectionStatus(event.status);
        };

        wsProvider.on("status", handleStatus);

        // State에 저장 (외부에서 쓸 수 있도록)
        setProvider(wsProvider);
        setIsInitialized(true);

        // ✅ Cleanup: 컴포넌트 언마운트/재실행 시 완벽하게 제거
        return () => {
            console.log(`🗑️ Provider 파괴: ${mindmapId}`);
            wsProvider.off("status", handleStatus);
            wsProvider.disconnect(); // 소켓 끊기
            wsProvider.destroy(); // ⭐️ 중요: Doc에서 이벤트 리스너 제거 및 메모리 해제
            setProvider(null);
        };
    }, [doc, mindmapId, token, snapshotStatus]);

    return {
        doc,
        provider,
        connectionStatus,
        snapshotStatus,
        isInitialized,
    };
}
