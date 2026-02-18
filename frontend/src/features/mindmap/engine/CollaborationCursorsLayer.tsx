import { useMindmapRemoteCursors } from "@/features/mindmap/hooks/useMindmapStoreState";

export default function CollaborationCursorsLayer() {
    const cursors = useMindmapRemoteCursors();

    if (!cursors || cursors.length === 0) return null;

    return (
        <g className="remote-cursors pointer-events-none">
            {cursors.map((c) => (
                <g key={c.clientId} transform={`translate(${c.cursor.x}, ${c.cursor.y})`}>
                    <circle r={6} fill={c.user.color} opacity={0.9} />
                    <circle r={10} fill="transparent" stroke={c.user.color} strokeWidth={2} opacity={0.6} />

                    <g transform="translate(12,-12)">
                        <rect x={0} y={0} width={90} height={20} rx={6} ry={6} fill={c.user.color} opacity={0.85} />
                        <text x={8} y={14} fontSize={12} fill="#fff">
                            {c.user.name}
                        </text>
                    </g>
                </g>
            ))}
        </g>
    );
}
