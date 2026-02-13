import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorManager";
import SharedMindMapController from "@/features/mindmap/shared_mindmap/utils/SharedMindmapController";
import { NodeId } from "@/features/mindmap/types/mindmap";
import { MindmapRoomId } from "@/features/mindmap/types/mindmap_room";
import { EventBroker } from "@/utils/EventBroker";
import generateId from "@/utils/generate_id";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

type UseSharedMindmapProps = {
    roomId: MindmapRoomId;
};

export const useSharedMindmap = ({ roomId }: UseSharedMindmapProps) => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    const [searchParams] = useSearchParams();

    const [userId] = useState(() => generateId());

    const userName = useMemo(() => {
        return searchParams.get("name") || `Guest-${userId.slice(0, 4)}`;
    }, [searchParams, userId]);

    const { controller, provider, broker, collaboratorsManager } = useMemo(() => {
        const doc = new Y.Doc();
        const provider = new WebsocketProvider(ENV.WS_BASE_URL, roomId, doc);
        const broker = new EventBroker<NodeId>();
        const controller = new SharedMindMapController(doc, broker, roomId);

        const userId = generateId();
        const collaboratorsManager = new CollaboratorsManager({
            provider,
            userInfo: {
                id: userId,
                name: userName,
                color: "#ff3421",
            },
        });

        return { controller, provider, broker, collaboratorsManager };

        // userName이 바뀌면 새로운 유저 세션으로 간주하고 다시 생성합니다.
    }, [roomId, userName]);

    useEffect(() => {
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
        };
    }, [provider]);

    return {
        controller,
        container: controller.container,
        broker,
        collaboratorsManager,
        connectionStatus,
    };
};
