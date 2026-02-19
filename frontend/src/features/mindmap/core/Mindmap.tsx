import { useMemo, useRef } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import CollaborationList from "@/features/mindmap/core/CollaborationList";
import { MindmapProvider } from "@/features/mindmap/core/MindmapProvider";
import MindmapRenderer from "@/features/mindmap/core/MindmapRenderer";
import { CollaboratorInfo } from "@/features/mindmap/types/mindmap_collaboration";

export type MindmapConfig = {
    layout?: { xGap?: number; yGap?: number };
    interaction?: { dragThreshold?: number };
};

type Props = {
    doc?: Y.Doc;
    mindmapId: string;
    provider?: WebsocketProvider;
    config?: MindmapConfig;
    user?: CollaboratorInfo;
};

/*
화면 전체를 차지하는 마인드맵을 렌더링합니다.
*/
const Mindmap = ({
    doc,
    mindmapId,
    provider,
    config = {
        layout: { xGap: 100, yGap: 20 },
        interaction: { dragThreshold: 5 },
    },
    user,
}: Props) => {
    const canvasRef = useRef<SVGSVGElement | null>(null);

    const resolvedConfig = useMemo<MindmapConfig>(
        () => ({
            layout: {
                xGap: config?.layout?.xGap ?? 100,
                yGap: config?.layout?.yGap ?? 20,
            },
            interaction: {
                dragThreshold: config?.interaction?.dragThreshold ?? 5,
            },
        }),
        [config?.layout?.xGap, config?.layout?.yGap, config?.interaction?.dragThreshold],
    );

    return (
        <MindmapProvider
            doc={doc}
            roomId={mindmapId}
            canvasRef={canvasRef}
            awareness={provider?.awareness ?? null}
            user={user}
            config={resolvedConfig}
        >
            <div className="flex flex-col w-full h-screen bg-slate-100 overflow-hidden">
                <CollaborationList />

                <div className="flex-1 relative min-h-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px]">
                    <svg ref={canvasRef} className="w-full h-full block">
                        <MindmapRenderer />
                    </svg>
                </div>
            </div>
        </MindmapProvider>
    );
};

export default Mindmap;
