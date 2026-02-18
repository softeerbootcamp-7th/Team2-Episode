// frontend/src/features/mindmap/engine/types.ts
import type * as Y from "yjs";

import type { DragSessionSnapshot, InteractionSnapshot } from "@/features/mindmap/types/mindmap_interaction";
import type { AddNodeDirection, NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";

/** React.MouseEvent / DOM MouseEvent / PointerEvent 모두 받을 수 있도록 최소 필드만 정의 */
export type PointerLikeEvent = {
    clientX: number;
    clientY: number;
    button?: number;
    buttons?: number;
    target?: EventTarget | null;

    preventDefault?: () => void;
    stopPropagation?: () => void;
};

export type WheelLikeEvent = {
    deltaY: number;
    clientX: number;
    clientY: number;

    preventDefault?: () => void;
};

export type LockInfo = { nodeId: NodeId; clientId: number; user: PresenceUserProfile; timestamp: number };
export type LocksSlice = {
    enabled: boolean;
    selfClientId: number | null;
    selfLockedNodeId: NodeId | null;
    byNodeId: Map<NodeId, LockInfo>;
};

export type KeyLikeEvent = {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;

    preventDefault?: () => void;
};

// ---------- Command ----------

export type CommandOrigin = "ui" | "remote" | "system";
export type CommandScope = "shared" | "local";

export type CommandMeta = {
    origin: CommandOrigin;
    timestamp: number;
    txId?: string;
    userId?: string;

    /** 레이아웃 적용 정책 힌트 */
    layout?: "auto" | "skip";
};

type BaseCommand<TType extends string, TScope extends CommandScope, TPayload> = {
    type: TType;
    scope: TScope;
    payload: TPayload;
    meta: CommandMeta;
};

export type MindmapCommand =
    // ---- shared(협업에 반영되는) ----
    | BaseCommand<
          "NODE/ADD",
          "shared",
          {
              baseId: NodeId;
              direction: NodeDirection; // "child" | "prev" | "next"
              side: AddNodeDirection; // 루트 아래 child로 붙일 때 left/right
              data?: { contents?: string };
          }
      >
    | BaseCommand<
          "NODE/MOVE",
          "shared",
          {
              targetId: NodeId;
              movingId: NodeId;
              direction: NodeDirection;
              side?: AddNodeDirection; // root child drop에서만
          }
      >
    | BaseCommand<"NODE/DELETE", "shared", { nodeId: NodeId }>
    | BaseCommand<"NODE/RESIZE", "shared", { nodeId: NodeId; width: number; height: number }>
    | BaseCommand<"NODE/UPDATE_CONTENTS", "shared", { nodeId: NodeId; contents: string }>

    // ---- local(UI 상태) ----
    | BaseCommand<"SELECTION/SET", "local", { nodeId: NodeId | null }>
    | BaseCommand<"INTERACTION/START_CREATE", "local", {}>
    | BaseCommand<"INTERACTION/CANCEL", "local", {}>
    | BaseCommand<"VIEWPORT/SET", "local", { x: number; y: number; scale: number }>;

// ---------- Store ----------
export type StoreChannel =
    | "graph"
    | "selection"
    | "viewport"
    | "interaction"
    | "dragSession"
    | "presence"
    | "cursors"
    | "locks"
    | `node:${NodeId}`
    | `lock:${NodeId}`;

export type MindmapState = {
    ready: boolean;

    graph: {
        rootId: NodeId;
        nodes: Map<NodeId, NodeElement>;
        revision: number;
    };

    selection: { selectedNodeId: NodeId | null };

    viewport: { x: number; y: number; scale: number };

    interaction: InteractionSnapshot;
    dragSession: DragSessionSnapshot;

    // presence
    presence: PresenceSlice;
    cursors: CursorsSlice;

    // ✅ locks
    locks: LocksSlice;
};

export type Listener = () => void;
export type Unsubscribe = () => void;

export interface MindmapStore {
    getState(): MindmapState;
    setState(updater: (prev: MindmapState) => MindmapState, opts?: { channels?: StoreChannel[] }): void;
    subscribe(channel: StoreChannel, cb: () => void): () => void;
}

// ---------- Engine ----------

export type MindmapEngineOptions = {
    roomId?: string;
    doc?: Y.Doc;
    rootContents?: string;

    config?: {
        layout?: { xGap?: number; yGap?: number };
        interaction?: { dragThreshold?: number };
    };

    debug?: boolean;
    onError?: (e: unknown) => void;
};

export interface IMindmapEngine {
    attachCanvas(svg: SVGSVGElement): void;
    detachCanvas(): void;
    destroy(): void;

    getStore(): MindmapStore;
    getState(): MindmapState;
    getCanvas(): SVGSVGElement | null;

    dispatch(cmd: MindmapCommand): void;
    batch(cmds: MindmapCommand[], meta?: Partial<CommandMeta>): void;

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
        startCreating(): void;
        cancelInteraction(): void;

        // ✅ lock controls (optional)
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

        // ✅ NEW
        doubleClick(e: PointerLikeEvent): void;
    };

    attachPresence(args: { awareness: AwarenessLike; user: PresenceUserProfile }): void;
    detachPresence(): void;
}

export type AdapterChange = {
    changedIds: NodeId[];
    local: boolean;
    origin: unknown;
};

export interface TreeAdapter {
    getMap(): Map<NodeId, NodeElement>;
    get(nodeId: NodeId): NodeElement | undefined;
    set(nodeId: NodeId, node: NodeElement): void;
    delete(nodeId: NodeId): void;

    transact(fn: () => void, origin?: unknown): void;

    onChange(cb: (change: AdapterChange) => void): () => void;
    destroy(): void;
}

// ---------- Presence types (현재 파일에 같이 존재하는 구조 유지) ----------

export type PresenceUserProfile = {
    id: string;
    name: string;
    color: string;
};

export type CursorPoint = { x: number; y: number };

export type Participant = {
    clientId: number;
    user: PresenceUserProfile;
    isSelf: boolean;
};

export type RemoteCursor = {
    clientId: number;
    user: PresenceUserProfile;
    cursor: CursorPoint;
};

export type PresenceSlice = {
    enabled: boolean;
    selfClientId: number | null;
    participants: Participant[];
};

export type CursorsSlice = {
    enabled: boolean;
    selfClientId: number | null;
    cursors: RemoteCursor[];
};

// ✅ Lock types
export type LockState = { nodeId: NodeId; at: number } | null;

export type AwarenessState = {
    user?: PresenceUserProfile;
    cursor?: CursorPoint | null;
    lock?: LockState;
};

export interface AwarenessLike {
    clientID: number;

    getStates(): Map<number, AwarenessState | null>;
    getLocalState(): AwarenessState | null;

    setLocalState(state: AwarenessState): void;
    setLocalStateField<K extends keyof AwarenessState>(field: K, value: AwarenessState[K]): void;

    on(event: "change" | "update", cb: (args: unknown) => void): void;
    off(event: "change" | "update", cb: (args: unknown) => void): void;
}
