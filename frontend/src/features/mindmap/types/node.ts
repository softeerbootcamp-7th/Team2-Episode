import { Point } from "@/features/mindmap/types/spatial";

/**
 * 마인드맵 데이터 구조 관련
 */
export type NodeId = string;

export type NodeType = "root" | "normal";

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

    // 계층 이동을 위한 Double Linked List
    firstChildId: NodeId | null;
    lastChildId: NodeId | null;
    nextId: NodeId | null;
    prevId: NodeId | null;
};
