import { Point } from "@/shared/types/spatial";

export type NodeId = string;

export type NodeType = "root" | "normal";

export type AddNodeDirection = "left" | "right";

export type NodeDirection = "prev" | "next" | "child";

export type Node = Point & {
    width: number;
    height: number;
};

export type NodeElement = Node & {
    parentId: NodeId;
    type: NodeType;

    firstChildId: NodeId | null;
    lastChildId: NodeId | null;

    nextId: NodeId | null;
    prevId: NodeId | null;

    addNodeDirection: AddNodeDirection;
    contents: string;

    firstChildIdLeft?: NodeId | null;
    lastChildIdLeft?: NodeId | null;
    firstChildIdRight?: NodeId | null;
    lastChildIdRight?: NodeId | null;
};
