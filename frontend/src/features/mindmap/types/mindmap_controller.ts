import type * as Y from "yjs";

import { MindmapConfig } from "@/features/mindmap/core/Mindmap";
import { AwarenessLike, CollaboratorInfo } from "@/features/mindmap/types/mindmap_collaboration";
import { MindmapCommand, MindmapCommandMeta } from "@/features/mindmap/types/mindmap_command";
import { AddNodeDirection, NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { MindmapStore, MindmapStoreState } from "@/features/mindmap/utils/mindmap_store";
import { KeyLikeEvent, PointerLikeEvent, WheelLikeEvent } from "@/shared/types/native_like_event";

export type IMindmapController = {
    attachCanvas(svg: SVGSVGElement): void;
    detachCanvas(): void;
    destroy(): void;

    getStore(): MindmapStore;
    getState(): MindmapStoreState;
    getCanvas(): SVGSVGElement | null;

    dispatch(cmd: MindmapCommand): void;
    batch(cmds: MindmapCommand[], meta?: Partial<MindmapCommandMeta>): void;

    query: {
        getRootId(): NodeId;
        getRootNode(): NodeElement;

        getNode(nodeId: NodeId): NodeElement | undefined;
        getParentId(nodeId: NodeId): NodeId | undefined;

        getChildIds(nodeId: NodeId): NodeId[];
        getChildNodes(nodeId: NodeId): NodeElement[];
        getAllDescendantIds(nodeId: NodeId): Set<NodeId>;
    };

    actions: {
        addNode(baseId: NodeId, direction: NodeDirection, side: AddNodeDirection, contents?: string): void;
        moveNode(targetId: NodeId, movingId: NodeId, direction: NodeDirection, side?: AddNodeDirection): void;
        deleteNode(nodeId: NodeId): void;
        updateNodeSize(nodeId: NodeId, w: number, h: number): void;
        updateNodeContents(nodeId: NodeId, contents: string): void;

        selectNode(nodeId: NodeId | null): void;
        resetViewport(): void;
        fitToContent(): void;
        startCreating(): void;
        cancelInteraction(): void;

        lockNode(nodeId: NodeId): void;
        unlockNode(): void;
    };

    input: {
        pointerDown(e: PointerLikeEvent): void;
        pointerMove(e: PointerLikeEvent): void;
        pointerUp(e: PointerLikeEvent): void;
        wheel(e: WheelLikeEvent): void;
        keyDown(e: KeyLikeEvent): void;
        resize(): void;

        doubleClick(e: PointerLikeEvent): void;
    };

    attachPresence(args: { awareness: AwarenessLike; user: CollaboratorInfo }): void;
    detachPresence(): void;
};

export type Listener = () => void;
export type Unsubscribe = () => void;

export type MindmapOptions = {
    roomId?: string;
    doc: Y.Doc;
    rootContents?: string;

    config?: MindmapConfig;

    debug?: boolean;
    onError?: (e: unknown) => void;
};

type RootChildPointers = {
    firstChildIdLeft?: NodeId | null;
    lastChildIdLeft?: NodeId | null;
    firstChildIdRight?: NodeId | null;
    lastChildIdRight?: NodeId | null;
};

export type NodePatch = Partial<Omit<NodeElement, "id">> & RootChildPointers;

export type AdapterChange = {
    changedIds: NodeId[];
    local: boolean;
    origin: string | null | object;
};

export type TreeAdapter = {
    getMap(): Map<NodeId, NodeElement>;
    get(nodeId: NodeId): NodeElement | undefined;
    set(nodeId: NodeId, node: NodeElement): void;
    update(nodeId: NodeId, patch: NodePatch): void;
    delete(nodeId: NodeId): void;

    transact(fn: () => void, origin?: unknown): void;

    onChange(cb: (change: AdapterChange) => void): () => void;
    destroy(): void;
};
