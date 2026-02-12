import { useEffect, useMemo, useState } from "react";
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

/**
 * 동시편집을 위해 웹소켓을 연결합니다.
 */
export const useSharedMindmap = ({ roomId }: UseSharedMindmapProps) => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    const { controller, provider, broker, collaboratorsManager } = useMemo(() => {
        const doc = new Y.Doc();

        const provider = new WebsocketProvider(ENV.WS_BASE_URL, roomId, doc);
        const broker = new EventBroker<NodeId>();
        const controller = new SharedMindMapController(doc, broker, roomId);
        const n = generateId();
        const collaboratorsManager = new CollaboratorsManager({
            provider,
            userInfo: { id: n, name: n, color: "#ff3421" },
        });

        return { controller, provider, broker, collaboratorsManager };
    }, [roomId]);

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
