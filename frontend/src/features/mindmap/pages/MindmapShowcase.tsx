import { useRef } from "react";

import MindMapRenderer from "@/features/mindmap/components/MindMapRenderer";
import { MindMapProvider } from "@/features/mindmap/providers/MindmapProvider";

/**
 * MindMapShowcase
 * 전체 화면을 차지하며 마인드맵 엔진의 모든 기능을 시연하는 메인 컴포넌트
 */
export default function MindMapShowcase() {
    // 엔진이 부착될 실제 SVG 엘리먼트의 참조
    const canvasRef = useRef<SVGSVGElement>(null);

    return (
        <div className="flex flex-col w-full h-screen bg-slate-100 overflow-hidden">
            <div className="flex-1 relative min-h-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px]">
                <MindMapProvider canvasRef={canvasRef}>
                    <svg ref={canvasRef} className="w-full h-full block">
                        <MindMapRenderer />
                    </svg>
                </MindMapProvider>
            </div>
        </div>
    );
}
