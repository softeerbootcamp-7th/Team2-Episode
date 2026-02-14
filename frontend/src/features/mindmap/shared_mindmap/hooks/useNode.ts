import { useSyncExternalStore } from "react";

import SharedMindMapController from "@/features/mindmap/shared_mindmap/utils/SharedMindmapController";
import { NodeId } from "@/features/mindmap/types/mindmap_node";
import { EventBroker } from "@/utils/EventBroker";

/**
 * Node UI 컴포넌트 안에서 사용하는 훅입니다.
 * nodeId에 해당하는 데이터가 변경되면 해당 컴포넌트만 rerendering을 트리거 해줍니다.
 */
export function useNode(nodeId: NodeId, controller: SharedMindMapController, broker: EventBroker<NodeId>) {
    const { container } = controller;

    const subscribe = (callback: () => void) => {
        return broker.subscribe({ key: nodeId, callback });
    };

    const getSnapshot = () => {
        return container.safeGetNode(nodeId);
    };

    return useSyncExternalStore(subscribe, getSnapshot);
}
