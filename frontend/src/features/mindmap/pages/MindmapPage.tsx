import { useRef } from "react";

import MindMapShowcase from "@/features/mindmap/pages/MindmapShowcase";
import { MindMapProvider } from "@/features/mindmap/providers/MindmapProvider";

const MindmapPage = () => {
    const canvasRef = useRef<SVGSVGElement | null>(null);

    return (
        <MindMapProvider canvasRef={canvasRef}>
            <MindMapShowcase canvasRef={canvasRef} />
        </MindMapProvider>
    );
};

export default MindmapPage;
