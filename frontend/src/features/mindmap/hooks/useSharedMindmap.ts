import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import { NodeElement, NodeId } from "@/features/mindmap/types/mindmap_type";
import SharedMindmapLayoutManager from "@/features/mindmap/utils/SharedMindmapLayoutManager";
import SharedTreeContainer, { ROOT_NODE_ID } from "@/features/mindmap/utils/SharedTreeContainer";
import { EventBroker } from "@/utils/EventBroker";

type CONNECTION_STATUS = "disconnected" | "connected" | "connecting";

type Props = {
    roomId: string;
};

const useSharedMindmap = ({ roomId }: Props) => {
    const [connectionStatus, setConnectedStatus] = useState<CONNECTION_STATUS>("disconnected");

    const { provider, doc, container, layoutManager, ...rest } = useMemo(() => {
        const doc = new Y.Doc();

        const provider = new WebsocketProvider(ENV.WS_BASE_URL, roomId, doc);
        const localProvider = new IndexeddbPersistence(roomId, doc);

        localProvider.on("synced", () => {
            toast.success("오프라인 상태에서 수정한 작업 내역을 반영하였습니다.");
        });

        const broker = new EventBroker<NodeId>();
        const container = new SharedTreeContainer({
            doc,
            broker,
            quadTreeManager: undefined,
            name: "Test Mindmap",
        });
        const layoutManager = new SharedMindmapLayoutManager({
            treeContainer: container,
            config: { xGap: 140, yGap: 60 },
        });
        return { doc, provider, container, layoutManager, broker };
    }, []);

    useEffect(() => {
        if (!provider.shouldConnect) {
            provider.connect();
        }

        provider.on("status", (e) => {
            setConnectedStatus(e.status);
        });

        return () => {
            provider.disconnect();
        };
    }, [provider]);

    useEffect(() => {
        const observer = (e: Y.YMapEvent<NodeElement>) => {
            e.keysChanged.forEach((key) => layoutManager.invalidate(key));

            // 자신이 일으킨 변화가 아닌 경우
            if (!e.transaction.local) {
                return;
            }

            layoutManager.updateLayout({
                rootId: ROOT_NODE_ID,
                rootCenterX: 0,
                rootCenterY: 0,
            });
        };

        container.yNodes.observe(observer);
    }, [doc, provider, container, layoutManager]);

    return {
        connectionStatus,
        provider,
        doc,
        container,
        layoutManager,
        ...rest,
    };
};

export default useSharedMindmap;
