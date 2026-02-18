import { useCursors } from "@/features/mindmap/shared_mindmap/hooks/useCursors";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorsManager";

export function CursorOverlaySvg({ manager }: { manager: CollaboratorsManager }) {
    const cursors = useCursors(manager);

    return (
        <g className="cursor-overlay" pointerEvents="none">
            {Array.from(cursors.entries()).map(([userId, c]) => (
                <g key={userId} transform={`translate(${c.x}, ${c.y})`}>
                    <path
                        d="M0 0 L0 18 L5 13 L9 22 L12 21 L8 12 L15 12 Z"
                        fill={c.color}
                        stroke="white"
                        strokeWidth={1}
                    />
                    <text x={18} y={12} fontSize={10} fill={c.color} stroke="white" strokeWidth={0.6}>
                        {c.name}
                    </text>
                </g>
            ))}
        </g>
    );
}
