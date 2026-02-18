import { Point } from "@/shared/types/spatial";

export type NodeId = string;

export type NodeType = "root" | "normal";

export type AddNodeDirection = "left" | "right";

export type NodeDirection = "prev" | "next" | "child";

export type NodeData = {
    contents: string;
    // pakxepakxe?: any; // 추가적인 확장 데이터를 위한 필드
};

export type Node = Point & {
    width: number;
    height: number;
    data: NodeData;
};

export type NodeElement = Node & {
    parentId: NodeId;
    type: NodeType;

    firstChildId: NodeId | null;
    lastChildId: NodeId | null;

    nextId: NodeId | null;
    prevId: NodeId | null;

    addNodeDirection: AddNodeDirection;

    firstChildIdLeft?: NodeId | null;
    lastChildIdLeft?: NodeId | null;
    firstChildIdRight?: NodeId | null;
    lastChildIdRight?: NodeId | null;
};
