import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorsManager";
import SharedMindMapController from "@/features/mindmap/shared_mindmap/utils/SharedMindmapController";
import { NodeId } from "@/features/mindmap/types/mindmap_node";
import { EventBroker } from "@/utils/EventBroker";
import generateId from "@/utils/generate_id";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

type UseSharedMindmapProps = {
    roomId: string;
    token: string | null;
    initialSnapshotUrl: string | null; // 추가됨
};

export const useSharedMindmap = ({ roomId, token, initialSnapshotUrl }: UseSharedMindmapProps) => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
    const [isSnapshotLoaded, setIsSnapshotLoaded] = useState(false); // 스냅샷 로딩 상태
    const [searchParams] = useSearchParams();

    // 1. Y.Doc은 한 번만 생성하여 유지합니다.
    const doc = useMemo(() => new Y.Doc(), []);

    // 2. 초기 스냅샷 데이터(presignedUrl) 가져오기
    useEffect(() => {
        if (!initialSnapshotUrl) {
            // URL이 없으면 빈 문서로 시작한다고 가정 (또는 로딩 대기)
            // 상황에 따라 여기서 return을 하거나 setIsSnapshotLoaded(true)를 할 수 있습니다.
            // 여기서는 URL이 올 때까지 기다리는 것으로 처리합니다.
            return;
        }

        const fetchSnapshot = async () => {
            try {
                // const response = await fetch(initialSnapshotUrl);
                // if (!response.ok) throw new Error("스냅샷 로딩 실패");
                // const buffer = await response.arrayBuffer();
                // // 데이터가 있을 경우에만 업데이트 적용
                // if (buffer.byteLength > 0) {
                //     Y.applyUpdate(doc, new Uint8Array(buffer));
                // }
                // setIsSnapshotLoaded(true); // 로딩 완료 플래그
                // console.log("Snapshot applied successfully");
            } catch (error) {
                console.error("Failed to load snapshot:", error);
                // 에러 처리 정책에 따라 alert를 띄우거나 재시도 로직 필요
            }
        };

        fetchSnapshot();
    }, [initialSnapshotUrl, doc]);

    // 사용자 정보 (Guest-XXXX)
    const [userId] = useState(() => generateId());
    const userName = useMemo(() => {
        return searchParams.get("name") || `Guest-${userId.slice(0, 4)}`;
    }, [searchParams, userId]);

    // 3. 스냅샷 로딩이 완료되고 토큰이 있을 때 WebSocket 등 초기화
    const contextValue = useMemo(() => {
        // 스냅샷이 로드되지 않았거나 토큰이 없으면 초기화하지 않음
        if (!isSnapshotLoaded || !token || !roomId) return null;

        // WebsocketProvider 생성
        const provider = new WebsocketProvider(ENV.WS_BASE_URL, roomId, doc, {
            params: {
                token: token,
            },
            // 자동 연결 방지 (아래 useEffect에서 명시적으로 connect)
            connect: false,
        });

        const broker = new EventBroker<NodeId>();
        const controller = new SharedMindMapController(doc, broker, roomId);

        const currentUserId = generateId();
        const collaboratorsManager = new CollaboratorsManager({
            provider,
            userInfo: {
                id: currentUserId,
                name: userName,
                color: "#ff3421",
            },
        });

        return { controller, provider, broker, collaboratorsManager };
    }, [roomId, token, userName, isSnapshotLoaded, doc]);

    // 4. 연결 관리
    useEffect(() => {
        if (!contextValue) return;

        const { provider } = contextValue;

        // 명시적으로 연결 시작
        if (!provider.shouldConnect) {
            provider.connect();
        }

        const handleStatus = (event: { status: ConnectionStatus }) => {
            setConnectionStatus(event.status);
        };

        provider.on("status", handleStatus);

        return () => {
            provider.off("status", handleStatus);
            provider.disconnect();
            provider.destroy();
        };
    }, [contextValue]);

    if (!contextValue) {
        return {
            controller: null,
            container: null,
            broker: null,
            collaboratorsManager: null,
            connectionStatus: "disconnected" as ConnectionStatus,
            isLoading: true, // 스냅샷 다운로드 중 or 토큰 대기 중
        };
    }

    return {
        controller: contextValue.controller,
        container: contextValue.controller.container,
        broker: contextValue.broker,
        collaboratorsManager: contextValue.collaboratorsManager,
        connectionStatus,
        isLoading: false,
    };
};
