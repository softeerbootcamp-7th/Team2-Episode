import { useEffect, useMemo, useState } from "react";

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
    // 1. 엔진 인스턴스는 즉시 생성
    // 리렌더링 시 인스턴스가 유지되도록 useMemo 사용
    const core = useMemo(() => new MindMapCore(() => setVersion((v) => v + 1)), []);

    // 리액트 UI를 갱신하기 위한 버전 상태
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const svg = canvasRef.current;

        // 이미 초기화되었거나 SVG가 아직 없다면 중단
        if (!svg || core.isReady) return;

        // 2. SVG의 실제 크기를 감시
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const { width, height } = entry.contentRect;

            // 실제 픽셀 크기가 확보된 시점에 엔진 초기화
            if (width > 0 && height > 0) {
                core.initialize(svg);
                // 초기화는 한 번이면 족하므로 감시 중단
                observer.disconnect();
            }
        });

        observer.observe(svg);
        return () => observer.disconnect();
    }, [canvasRef, core]);

    // 3. 외부 노출용 액션 (core가 상수로 존재하므로 내부 체크 생략 가능)
    const actions = useMemo(
        () => ({
            addNode: (parentId: NodeId, direction: NodeDirection, addNodeDirection: AddNodeDirection) => {
                core.addNode(parentId, direction, addNodeDirection);
            },
            deleteNode: (nodeId: NodeId) => core.deleteNode(nodeId),
            updateNodeSize: (nodeId: NodeId, width: number, height: number) =>
                core.updateNodeSize(nodeId, width, height),
            moveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection) =>
                core.moveNode(targetId, movingId, direction),
        }),
        [core],
    );

    // core가 인스턴스화 되었을 때 컨텍스트 값 생성
    const controller = useMemo(() => ({ core, actions }), [core, actions]);
    const stateValue = useMemo(() => ({ version }), [version]);

    return (
        <MindMapRefContext.Provider value={controller}>
            <MindMapStateContext.Provider value={stateValue}>{children}</MindMapStateContext.Provider>
        </MindMapRefContext.Provider>
    );
};
