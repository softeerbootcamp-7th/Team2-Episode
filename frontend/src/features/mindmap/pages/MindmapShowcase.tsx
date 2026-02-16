import MindMapRenderer from "@/features/mindmap/components/canvas/MindMapRenderer";

interface MindMapShowcaseProps {
    canvasRef: React.RefObject<SVGSVGElement | null>;
}

export default function MindMapShowcase({ canvasRef }: MindMapShowcaseProps) {
    return (
        <div className="flex flex-col w-full h-screen bg-slate-100 overflow-hidden">
            <div className="flex-1 relative min-h-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px]">
                <svg ref={canvasRef} className="w-full h-full block">
                    <MindMapRenderer />
                </svg>
            </div>
        </div>
    );
}
