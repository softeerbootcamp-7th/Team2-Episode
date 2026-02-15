import { cva, VariantProps } from "class-variance-authority";

import { NodeColor } from "@/features/mindmap/node/constants/colors";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";
import { getParentChildEdgeAnchors } from "@/features/mindmap/utils/node_geometry";
import { getBezierPath } from "@/features/mindmap/utils/path";
import { cn } from "@/utils/cn";

type EdgeLayerProps = {
    nodeMap: Map<NodeId, NodeElement>;
    filterNode: NodeElement[]; //이번 레이어에서 그릴 노드 ID(선명하게, 투명하게 그려야 하는 경우가 나뉨)
    color?: NodeColor;
    type?: "active" | "ghost";
} & VariantProps<typeof edgeVariants>;

export const edgeVariants = cva("fill-none", {
    variants: {
        type: {
            active: "stroke",
            ghost: "stroke-2 stroke-node-blue-op-100 [stroke-dasharray:8_4]",
        },
        color: {
            violet: "stroke-node-violet-op-100",
            blue: "stroke-node-blue-op-100",
            skyblue: "stroke-node-skyblue-op-100",
            mint: "stroke-node-mint-op-100",
            cyan: "stroke-node-cyan-op-100",
            purple: "stroke-node-purple-op-100",
            magenta: "stroke-node-magenta-op-100",
            navy: "stroke-node-navy-op-100",
        },
    },
});

export default function EdgeLayer({ nodeMap, color, type = "active", filterNode }: EdgeLayerProps) {
    return (
        <g className="edge-layer">
            {filterNode.map((node) => {
                if (!node.parentId || node.parentId === "empty") return null;

                const parent = nodeMap.get(node.parentId);
                if (!parent) return null;

                const { start, end } = getParentChildEdgeAnchors(parent, node);

                const pathD = getBezierPath(start.x, start.y, end.x, end.y);

                return (
                    <g key={`edge-${node.id}`}>
                        <path d={pathD} className={cn(edgeVariants({ type, color }))} />

                        <circle cx={start.x} cy={start.y} r={4} fill="red" />
                        <circle cx={end.x} cy={end.y} r={4} fill="lime" />
                    </g>
                );
            })}
        </g>
    );
}
