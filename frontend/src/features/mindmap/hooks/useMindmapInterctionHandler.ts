import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { useMindmapActions, useMindmapContainer } from "@/features/mindmap/providers/MindmapProvider";
import { ViewportTransform } from "@/features/mindmap/types/mindmap_interaction_type";
import { MindmapInteractionManager } from "@/features/mindmap/utils/MindmapInteractionManager";

export const useMindmapInteractionHandler = (
    transform: ViewportTransform,
    setTransform: React.Dispatch<React.SetStateAction<ViewportTransform>>,
) => {
    const container = useMindmapContainer();
    const { moveNode } = useMindmapActions();

    const [, setTick] = useState(0);
    const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

    const managerRef = useRef<MindmapInteractionManager | null>(null);

    if (!managerRef.current) {
        managerRef.current = new MindmapInteractionManager(
            container,
            forceUpdate,
            (dx, dy) => {
                setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            },
            (targetId, movingId) => {
                try {
                    moveNode(targetId, movingId);
                } catch (e) {
                    console.error("이동 실패", e);
                }
            },
        );
    }

    useLayoutEffect(() => {
        managerRef.current?.setTransform(transform);
    }, [transform]);

    const handlers = {
        onMouseDown: (e: React.MouseEvent) => managerRef.current?.handleMouseDown(e),
        onMouseMove: (e: React.MouseEvent) => managerRef.current?.handleMouseMove(e),
        onMouseUp: (e: React.MouseEvent) => managerRef.current?.handleMouseUp(e),
        onMouseLeave: (e: React.MouseEvent) => managerRef.current?.handleMouseUp(e),
    };

    return {
        handlers,
        ...managerRef.current.getInteractionStatus(),
    };
};
