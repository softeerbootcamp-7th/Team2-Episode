import { useLayoutEffect, useRef } from "react";

import { NodeElement, NodeId } from "@/features/mindmap/types/mindmap";
import { isSame } from "@/utils/is_same";

type Props = {
    nodeId: NodeId;
    node?: NodeElement;
    onResize: ({ width, height }: { width: number; height: number }) => void;
};
/**
 * 타겟 노드의 크기가 변경되면 콜백을 실행합니다.
 */
export function useNodeResizeObserver({ nodeId, node, onResize }: Props) {
    const nodeRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!nodeRef.current || !node) {
            return;
        }

        const rect = nodeRef.current.getBoundingClientRect();

        const newWidth = Math.ceil(rect.width);
        const newHeight = Math.ceil(rect.height);

        const isChanged = !isSame(node.width, newWidth) || !isSame(node.height, newHeight);
        if (isChanged) {
            onResize({ height: newHeight, width: newWidth });
        }
    }, [nodeId, node?.x, node?.y]);

    return nodeRef;
}
