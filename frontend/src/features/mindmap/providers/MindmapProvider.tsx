import { useEffect, useMemo, useRef, useState } from "react";

import MindMapCore from "@/features/mindmap/core/MindMapCore";
import { MindMapRefContext, MindMapStateContext } from "@/features/mindmap/providers/MindmapContext";
import { AddNodeDirection, NodeDirection, NodeId } from "@/features/mindmap/types/node";

export const MindMapProvider = ({
    children,
    canvasRef,
}: {
    children: React.ReactNode;
    canvasRef: React.RefObject<SVGSVGElement | null>;
}) => {
    const coreRef = useRef<MindMapCore | null>(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const svg = canvasRef.current;
        if (!svg || coreRef.current) return;

        const observer = new ResizeObserver((entries) => {
            // entries가 배열이므로 안전하게 첫 번째 요소를 가져옵니다.
            const entry = entries[0];
            if (!entry) return; // entry가 없으면 중단

            const { width, height } = entry.contentRect;

            if (width > 0 && height > 0) {
                coreRef.current = new MindMapCore(svg, () => setVersion((v) => v + 1));
                setVersion((v) => v + 1);

                observer.disconnect();
            }
        });

        observer.observe(svg);
        return () => observer.disconnect();
    }, [canvasRef]);

    const actions = useMemo(
        () => ({
            addNode: (parentId: NodeId, direction: NodeDirection, addNodeDirection: AddNodeDirection) => {
                if (coreRef.current) {
                    coreRef.current.addNode(parentId, direction, addNodeDirection);
                } else {
                    console.error("Core가 아직 준비되지 않았습니다!");
                }
            },
            deleteNode: (nodeId: NodeId) => coreRef.current?.deleteNode(nodeId),
            updateNodeSize: (nodeId: NodeId, width: number, height: number) =>
                coreRef.current?.updateNodeSize(nodeId, width, height),
            moveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection) =>
                coreRef.current?.moveNode(targetId, movingId, direction),
        }),
        [],
    );

    // core가 인스턴스화 되었을 때 컨텍스트 값 생성
    const controller = useMemo(() => {
        return { core: coreRef.current as MindMapCore, actions };
    }, [version]);

    const stateValue = useMemo(() => ({ version }), [version]);

    return (
        <MindMapRefContext.Provider value={controller}>
            <MindMapStateContext.Provider value={stateValue}>{children}</MindMapStateContext.Provider>
        </MindMapRefContext.Provider>
    );
};
