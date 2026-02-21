import { nodeVariants } from "@/features/mindmap/node/components/node/Node";
import { DefinedVariantProps } from "@/shared/types/safe_variant_props";

export type NodeVariant = "idle" | "interactive" | "highlighted";

export type NodeSize = DefinedVariantProps<typeof nodeVariants>["size"];
