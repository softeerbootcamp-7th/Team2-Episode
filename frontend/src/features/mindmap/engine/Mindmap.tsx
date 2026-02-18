import { useRef } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import CollaborationList from "@/features/mindmap/engine/CollaborationList";
import MindmapRenderer from "@/features/mindmap/engine/MindmapRenderer";
import { MindmapConfig, PresenceUserProfile } from "@/features/mindmap/engine/types";
import { MindMapProvider } from "@/features/mindmap/providers/MindmapProvider";

type Props = {
    doc: Y.Doc | undefined;
    mindmapId: string;
    provider?: WebsocketProvider;
    config?: MindmapConfig;
    user?: PresenceUserProfile;
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

    return (
        <MindMapProvider
            doc={doc}
            roomId={mindmapId}
            canvasRef={canvasRef}
            awareness={provider?.awareness ?? null}
            user={user}
            config={config}
        >
            <div className="flex flex-col w-full h-screen bg-slate-100 overflow-hidden">
                <CollaborationList />

                <div className="flex-1 relative min-h-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px]">
                    <svg ref={canvasRef} className="w-full h-full block">
                        <MindmapRenderer />
                    </svg>
                </div>
            </div>
        </MindMapProvider>
    );
};

export default Mindmap;
