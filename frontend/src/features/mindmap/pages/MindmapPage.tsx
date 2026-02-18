import { useRef } from "react";
import { useParams } from "react-router";

import MindMapRenderer from "@/features/mindmap/components/MindMapRenderer";
import { useMindmapSession } from "@/features/mindmap/hooks/useMindmapSession";
import { MindMapProvider } from "@/features/mindmap/providers/MindmapProvider";
import { CollaboratorList } from "@/features/mindmap/shared_mindmap/components/CollaboratorList";
import { CursorOverlaySvg } from "@/features/mindmap/shared_mindmap/components/CursorsOverlaySvg";
import { MindmapAwarenessBridge } from "@/features/mindmap/shared_mindmap/components/MindmapAwarenessBridge";

export default function MindmapPage() {
    const { mindmapId } = useParams<{ mindmapId: string }>();
    const canvasRef = useRef<SVGSVGElement | null>(null);

    if (!mindmapId) return <div>잘못된 접근입니다.</div>;

    const { doc, collaboratorsManager, connectionStatus, isLoading } = useMindmapSession({
        mindmapId,
        enableAwareness: true, // PRIVATE면 false
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>마인드맵 데이터를 불러오는 중입니다...</p>
            </div>
        );
    }

    return (
        <MindMapProvider canvasRef={canvasRef} doc={doc} roomId={mindmapId}>
            <div className="flex flex-col w-full h-screen bg-slate-100 overflow-hidden">
                <div className="fixed top-4 right-4 z-50 bg-white p-2 rounded shadow">상태: {connectionStatus}</div>

                {collaboratorsManager && (
                    <>
                        <MindmapAwarenessBridge manager={collaboratorsManager} />
                        <CollaboratorList manager={collaboratorsManager} />
                    </>
                )}

                <div className="flex-1 relative min-h-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px]">
                    <svg ref={canvasRef} className="w-full h-full block">
                        <MindMapRenderer />
                        {collaboratorsManager && <CursorOverlaySvg manager={collaboratorsManager} />}
                    </svg>
                </div>
            </div>
        </MindMapProvider>
    );
}
