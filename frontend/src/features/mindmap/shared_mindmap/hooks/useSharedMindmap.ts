import { useEffect, useMemo, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import SharedMindMapController from "@/features/mindmap/shared_mindmap/utils/SharedMindmapController";
import { NodeId } from "@/features/mindmap/types/mindmap";
import { MindmapRoomId } from "@/features/mindmap/types/mindmap_room";
import { EventBroker } from "@/utils/EventBroker";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

type UseSharedMindmapProps = {
    roomId: MindmapRoomId;
};

/**
 * 동시편집을 위해 웹소켓을 연결합니다.
 */
export const useSharedMindmap = ({ roomId }: UseSharedMindmapProps) => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    const { controller, provider } = useMemo(() => {
        const doc = new Y.Doc();

        const provider = new WebsocketProvider(ENV.WS_BASE_URL, roomId, doc);

        const broker = new EventBroker<NodeId>();
        const controller = new SharedMindMapController(doc, broker, roomId);

        return { controller, provider };
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

        connectionStatus,
    };
};
