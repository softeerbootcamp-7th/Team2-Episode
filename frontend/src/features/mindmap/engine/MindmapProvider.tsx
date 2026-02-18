import React, { createContext, useContext, useEffect, useState } from "react";
import * as Y from "yjs";

import { createMindmapController } from "@/features/mindmap/engine/MindmapController";
import { AwarenessLike, CollaboratorInfo } from "@/features/mindmap/types/mindmap_collaboration";
import { IMindmapController, MindmapOptions } from "@/features/mindmap/types/mindmap_controller";

export const MindmapControllerContext = createContext<IMindmapController | null>(null);

export function useMindmapControllerContext() {
    const engine = useContext(MindmapControllerContext);
    if (!engine) throw new Error("MindmapEngineProvider missing!");
    return engine;
}

type Props = {
    children: React.ReactNode;
    canvasRef?: React.RefObject<SVGSVGElement | null>;
    doc?: Y.Doc;
    roomId?: string;
    rootContents?: string;
    config?: MindmapOptions["config"];
    debug?: boolean;
    onError?: MindmapOptions["onError"];
    awareness?: AwarenessLike | null;
    user?: CollaboratorInfo | null;
};

export function MindmapProvider({
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
    const [engine, setEngine] = useState<IMindmapController | null>(null);

    useEffect(() => {
        if (!doc) return;

        const newEngine = createMindmapController({
            doc,
            roomId,
            rootContents,
            config,
            debug,
            onError,
        });

        setEngine(newEngine);

        return () => {
            newEngine.destroy();
            setEngine(null);
        };
    }, [doc, roomId, rootContents, config, debug, onError]);

    useEffect(() => {
        if (!engine) return;

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
    }, [canvasRef, engine]);

    useEffect(() => {
        if (!awareness || !user) return;

        engine?.attachPresence({ awareness, user });

        return () => {
            engine?.detachPresence();
        };
    }, [engine, awareness, user]);

    // 엔진이 준비되지 않았을 때는 children을 렌더링하지 않음
    if (!engine) return null;

    return <MindmapControllerContext.Provider value={engine}>{children}</MindmapControllerContext.Provider>;
}
