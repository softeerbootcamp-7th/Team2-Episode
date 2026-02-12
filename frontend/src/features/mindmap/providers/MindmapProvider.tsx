import { useMemo, useRef, useState } from "react";

import MindMapCore from "@/features/mindmap/core/MindMapCore";
import { MindMapRefContext, MindMapStateContext } from "@/features/mindmap/providers/MindmapContext";
import { NodeDirection, NodeId } from "@/features/mindmap/types/node";

export const MindMapProvider = ({
    children,
    canvasRef,
}: {
    children: React.ReactNode;
    canvasRef: React.RefObject<SVGSVGElement>;
}) => {
    const coreRef = useRef<MindMapCore | null>(null);
    const [version, setVersion] = useState(0);

    // Core 초기화: 이제 Core 내부에서 broker와 tree를 스스로 만듭니다.
    if (!coreRef.current && canvasRef.current) {
        // Core 생성자 인자가 (canvas, onGlobalUpdate) 2개로 줄어든 것을 반영
        coreRef.current = new MindMapCore(canvasRef.current, () => setVersion((v) => v + 1));
    }

    const actions = useMemo(
        () => ({
            addNode: (parentId: NodeId, direction: NodeDirection) => coreRef.current?.addNode(parentId, direction),
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
        if (!coreRef.current) return null;
        return { core: coreRef.current, actions };
    }, [coreRef.current]); // version 대신 coreRef.current 존재 여부로 판단

    const stateValue = useMemo(() => ({ version }), [version]);

    return (
        <MindMapRefContext.Provider value={controller}>
            <MindMapStateContext.Provider value={stateValue}>
                {/* Core가 준비된 후에만 자식(Renderer 등)을 보여줍니다 */}
                {coreRef.current ? children : null}
            </MindMapStateContext.Provider>
        </MindMapRefContext.Provider>
    );
};
