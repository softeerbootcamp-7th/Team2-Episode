import { cva, VariantProps } from "class-variance-authority";

import { NodeColor } from "@/features/mindmap/node/constants/colors";
import { NodeElement, NodeId } from "@/features/mindmap/types/node";
import { getBezierPath } from "@/features/mindmap/utils/path";
import { cn } from "@/utils/cn";

type EdgeLayerProps = {
    nodeMap: Map<NodeId, NodeElement>;
    filterNode: NodeElement[]; //이번 레이어에서 그릴 노드 ID(선명하게, 투명하게 그려야 하는 경우가 나뉨)
    color?: NodeColor;
    type?: "active" | "ghost";
} & VariantProps<typeof edgeVariants>;

export const edgeVariants = cva("fill-none stroke-2 transition-all duration-300", {
    variants: {
        type: {
            active: "",
            ghost: "border-dashed bg-node-blue-op-15 [stroke-dasharray:4_4]",
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

/** 노드 사이 모든 '선' 담당 */
export default function EdgeLayer({ nodeMap, color, type = "active", filterNode }: EdgeLayerProps) {
    return (
        <g className="edge-layer">
            {filterNode.map((node) => {
                const parent = nodeMap.get(node.parentId);

                if (!parent) {
                    return null;
                }

                return (
                    <path
                        key={`edge-${node.id}`}
                        d={getBezierPath(parent.x + parent.width / 2, parent.y, node.x - node.width / 2, node.y)}
                        className={cn(edgeVariants({ type, color }))}
                    />
                );
            })}
        </g>
    );
}
