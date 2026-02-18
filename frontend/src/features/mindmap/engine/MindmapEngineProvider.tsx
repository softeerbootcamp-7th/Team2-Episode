import React, { useEffect, useState } from "react"; // useMemo 제거, useState 추가
import * as Y from "yjs";

import { createMindmapEngine } from "@/features/mindmap/engine/MindmapController";
import { MindmapEngineContext } from "@/features/mindmap/engine/MindmapEngineContext";
import type {
    AwarenessLike,
    IMindmapEngine,
    MindmapEngineOptions,
    PresenceUserProfile,
} from "@/features/mindmap/engine/types"; // Type import 확인

type Props = {
    children: React.ReactNode;
    canvasRef?: React.RefObject<SVGSVGElement | null>;
    doc?: Y.Doc;
    roomId?: string;
    rootContents?: string;
    config?: MindmapEngineOptions["config"];
    debug?: boolean;
    onError?: MindmapEngineOptions["onError"];
    awareness?: AwarenessLike | null;
    user?: PresenceUserProfile | null;
};

export function MindmapEngineProvider({
    children,
    canvasRef,
    doc,
    roomId,
    rootContents,
    config,
    debug,
    onError,
    awareness,
    user,
}: Props) {
    // ✅ 1. useMemo 대신 useState로 엔진 인스턴스 관리
    const [engine, setEngine] = useState<IMindmapEngine | null>(null);

    // ✅ 2. 엔진의 생성과 파괴를 하나의 useEffect 안에서 묶어서 처리
    useEffect(() => {
        const newEngine = createMindmapEngine({
            doc,
            roomId,
            rootContents,
            config,
            debug,
            onError,
        });

        setEngine(newEngine);

        // cleanup 시 생성했던 바로 그 인스턴스를 파괴
        return () => {
            newEngine.destroy();
            setEngine(null);
        };
    }, [doc, roomId, rootContents, config, debug, onError]);

    // 3. Canvas Attach (engine이 생성된 이후에 실행)
    useEffect(() => {
        if (!engine) return; // 엔진이 아직 없으면 스킵

        const svg = canvasRef?.current;
        if (!svg) return;

        try {
            engine.attachCanvas(svg);
        } catch (e) {
            console.error("Failed to attach canvas:", e);
        }

        const ro = new ResizeObserver(() => {
            engine.input.resize();
        });

        ro.observe(svg);

        return () => {
            ro.disconnect();
            engine.detachCanvas();
        };
    }, [canvasRef, engine]); // engine 인스턴스가 교체되면 다시 실행됨

    // ✅ 엔진이 준비되지 않았을 때는 children을 렌더링하지 않거나(null), 로딩 처리를 함
    // (하위 컴포넌트에서 useMindmapEngine() 호출 시 null check 에러 방지)

    useEffect(() => {
        if (!awareness || !user) return;

        engine?.attachPresence({ awareness, user });

        return () => {
            engine?.detachPresence();
        };
    }, [engine, awareness, user]);

    if (!engine) return null;

    return <MindmapEngineContext.Provider value={engine}>{children}</MindmapEngineContext.Provider>;
}
