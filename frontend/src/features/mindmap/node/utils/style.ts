import { COLOR_CLASS_MAP, type NodeColor, SHADOW_CLASS_MAP } from "@/features/mindmap/node/constants/colors";
import { NodeSize, NodeVariant } from "@/features/mindmap/node/types/node";

export function shadowClass(color: NodeColor) {
    return SHADOW_CLASS_MAP[color];
}

export function colorBySize({ size, color, variant }: { size: NodeSize; color: NodeColor; variant: NodeVariant }) {
    // border 클래스(예: 'border-blue-500') 대신 ring 클래스(예: 'ring-blue-500')를 가져옵니다.
    const ring = COLOR_CLASS_MAP.ring[color][100];

    const STATE_SIZE_STYLES: Record<NodeVariant, Record<NodeSize, string>> = {
        idle: {
            sm: `ring-1 ring-inset ${ring} bg-white`,
            md: `ring-1 ring-inset ${ring} ${COLOR_CLASS_MAP.bg[color][5]}`,
            lg: `ring-1 ring-inset ${ring} ${COLOR_CLASS_MAP.bg[color][15]}`,
        },
        highlighted: {
            sm: `ring-2 ring-inset ${ring} bg-white`,
            md: `ring-2 ring-inset ${ring} ${COLOR_CLASS_MAP.bg[color][5]}`,
            lg: `ring-2 ring-inset ${ring} ${COLOR_CLASS_MAP.bg[color][15]}`,
        },
        interactive: {
            sm: `ring-2 ring-inset ${ring} bg-white`,
            md: `ring-2 ring-inset ${ring} ${COLOR_CLASS_MAP.bg[color][5]}`,
            lg: `ring-2 ring-inset ${ring} ${COLOR_CLASS_MAP.bg[color][15]}`,
        },
    };

    return STATE_SIZE_STYLES[variant][size];
}
