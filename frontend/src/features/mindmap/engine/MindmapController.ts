import QuadTree from "@/features/mindmap/core/QuadTree";
import { InteractionMachine } from "@/features/mindmap/engine/InteractionMachine";
import { MockAdapter } from "@/features/mindmap/engine/MockAdaptor";
import { PresenceManager } from "@/features/mindmap/engine/PresenseManager";
import { TreeModel } from "@/features/mindmap/engine/TreeModel";
import type {
    AdapterChange,
    AwarenessLike,
    CommandMeta,
    IMindmapEngine,
    KeyLikeEvent,
    LockInfo,
    MindmapCommand,
    MindmapEngineOptions,
    MindmapState,
    PointerLikeEvent,
    PresenceUserProfile,
    StoreChannel,
    TreeAdapter,
    WheelLikeEvent,
} from "@/features/mindmap/engine/types";
import { ViewportController } from "@/features/mindmap/engine/ViewportController";
import { YjsAdapter } from "@/features/mindmap/engine/YjsAdaptor";
import { EMPTY_DRAG_SESSION_SNAPSHOT, EMPTY_INTERACTION_SNAPSHOT } from "@/features/mindmap/types/mindmap_interaction";
import type { AddNodeDirection, NodeDirection, NodeId } from "@/features/mindmap/types/node";
import type { Rect } from "@/features/mindmap/types/spatial";
import { computeMindmapLayout } from "@/features/mindmap/utils/compute_mindmap_layout";
import { createMindmapStore } from "@/features/mindmap/utils/mindmap_store";

function makeMeta(partial?: Partial<CommandMeta>): CommandMeta {
    return {
        origin: partial?.origin ?? "ui",
        timestamp: partial?.timestamp ?? Date.now(),
        txId: partial?.txId,
        userId: partial?.userId,
        layout: partial?.layout ?? "auto",
    };
}

function isAddNodeDirection(x: string | null): x is AddNodeDirection {
    return x === "left" || x === "right";
}

function getTxOriginType(origin: unknown): string | undefined {
    if (!origin || typeof origin !== "object") return undefined;
    if (!("type" in origin)) return undefined;
    const t = (origin as { type?: unknown }).type;
    return typeof t === "string" ? t : undefined;
}

function isElement(x: unknown): x is Element {
    return typeof Element !== "undefined" && x instanceof Element;
}

function resolveHit(
    target: EventTarget | null | undefined,
): { kind: "node"; nodeId: NodeId; action?: { type: "add-child"; side: AddNodeDirection } } | { kind: "canvas" } {
    if (!target || !isElement(target)) return { kind: "canvas" };

    const nodeEl = target.closest?.("[data-node-id]");
    if (!nodeEl) return { kind: "canvas" };

    const nodeIdAttr = nodeEl.getAttribute("data-node-id");
    if (!nodeIdAttr) return { kind: "canvas" };
    const nodeId = nodeIdAttr as NodeId;

    const actionEl = target.closest?.("[data-action]");
    if (actionEl?.getAttribute("data-action") === "add-child") {
        const dirAttr = actionEl.getAttribute("data-direction");
        const side: AddNodeDirection = isAddNodeDirection(dirAttr) ? dirAttr : "right";
        return { kind: "node", nodeId, action: { type: "add-child", side } };
    }
    return { kind: "node", nodeId };
}

export function createMindmapEngine(opts: MindmapEngineOptions = {}): MindmapEngine {
    return new MindmapEngine(opts);
}

class MindmapEngine implements IMindmapEngine {
    private opts: MindmapEngineOptions;

    private adapter: TreeAdapter;
    private tree: TreeModel;

    private presenceManager: PresenceManager | null = null;

    private quadTree: QuadTree;
    private canvas: SVGSVGElement | null = null;
    private viewport: ViewportController | null = null;

    private interaction: InteractionMachine | null = null;

    private store = createMindmapStore(this.makeInitialState());

    private unsubAdapter: (() => void) | null = null;

    // viewport store commit coalesce(rAF)
    private viewportCommitScheduled = false;

    private destroyed = false;

    constructor(opts: MindmapEngineOptions) {
        this.opts = opts;

        const roomId = opts.roomId ?? "local";
        const rootContents = opts.rootContents ?? "";

        // ✅ adapter 선택
        if (opts.doc) {
            this.adapter = new YjsAdapter({
                doc: opts.doc,
                roomId,
                rootContents,
            });
        } else {
            this.adapter = new MockAdapter(rootContents);
        }

        this.tree = new TreeModel(this.adapter);

        this.quadTree = new QuadTree(this.calculateInitialBounds());

        // ✅ 모든 변경(local/remote)을 한 곳에서 처리 (command 기반 transact 통합)
        this.unsubAdapter = this.adapter.onChange((c) => this.handleAdapterChange(c));

        // 초기 snapshot 반영(attachCanvas 이전에도 store에서 nodeMap 사용 가능)
        this.refreshGraphChannels(["graph"]);
    }

    // ---- MindmapEngine API ----

    getCanvas(): SVGSVGElement | null {
        return this.canvas;
    }

    query = {
        getRootId: () => this.tree.getRootId(),
        getRootNode: () => this.tree.getRootNode(),

        getNode: (id: NodeId) => this.tree.safeGetNode(id),
        getParentId: (id: NodeId) => this.tree.getParentId(id),

        getChildIds: (id: NodeId) => this.tree.getChildIds(id),
        getChildNodes: (id: NodeId) => this.tree.getChildNodes(id),
        getAllDescendantIds: (id: NodeId) => this.tree.getAllDescendantIds(id),
    };

    attachPresence(args: { awareness: AwarenessLike; user: PresenceUserProfile }) {
        this.assertNotDestroyed();
        this.detachPresence();

        const { awareness, user } = args;

        // ✅ enable slices
        this.store.setState(
            (prev) => ({
                ...prev,
                presence: { ...prev.presence, enabled: true, selfClientId: awareness.clientID },
                cursors: { ...prev.cursors, enabled: true, selfClientId: awareness.clientID },
                locks: {
                    ...prev.locks,
                    enabled: true,
                    selfClientId: awareness.clientID,
                    selfLockedNodeId: null,
                    byNodeId: new Map(),
                },
            }),
            { channels: ["presence", "cursors", "locks"] },
        );

        const diffLockIds = (prevMap: Map<NodeId, LockInfo>, nextMap: Map<NodeId, LockInfo>): NodeId[] => {
            const changed = new Set<NodeId>();

            // removed or changed
            for (const [id, prev] of prevMap.entries()) {
                const next = nextMap.get(id);
                if (!next) {
                    changed.add(id);
                    continue;
                }
                if (
                    prev.clientId !== next.clientId ||
                    prev.user.id !== next.user.id ||
                    prev.user.name !== next.user.name ||
                    prev.user.color !== next.user.color ||
                    prev.timestamp !== next.timestamp
                ) {
                    changed.add(id);
                }
            }

            // added
            for (const [id] of nextMap.entries()) {
                const prev = prevMap.get(id);
                if (!prev) changed.add(id);
            }

            return Array.from(changed);
        };

        this.presenceManager = new PresenceManager(
            {
                awareness,
                getCanvasRect: () => this.canvas?.getBoundingClientRect() ?? null,
                screenToWorld: (x, y) => this.viewport!.screenToWorld(x, y),

                commitPresence: (next) => {
                    this.store.setState((prev) => ({ ...prev, presence: next }), { channels: ["presence"] });
                },

                commitCursors: (next) => {
                    this.store.setState((prev) => ({ ...prev, cursors: next }), { channels: ["cursors"] });
                },

                // ✅ NEW
                commitLocks: (next) => {
                    const prev = this.store.getState().locks;
                    const changedIds = diffLockIds(prev.byNodeId, next.byNodeId);

                    const channels: StoreChannel[] = ["locks"];
                    for (const id of changedIds) channels.push(`lock:${id}` as StoreChannel);

                    // selfLockedNodeId가 바뀌면 기존 노드도 깨워야 할 수 있으니(“(나)”표시 등) 추가 notify
                    if (prev.selfLockedNodeId && prev.selfLockedNodeId !== next.selfLockedNodeId) {
                        channels.push(`lock:${prev.selfLockedNodeId}` as StoreChannel);
                    }
                    if (next.selfLockedNodeId) {
                        channels.push(`lock:${next.selfLockedNodeId}` as StoreChannel);
                    }

                    this.store.setState((p) => ({ ...p, locks: next }), { channels });
                },
            },
            user,
        );
    }

    detachPresence() {
        if (!this.presenceManager) return;

        this.presenceManager.destroy();
        this.presenceManager = null;

        this.store.setState(
            (prev) => ({
                ...prev,
                presence: { enabled: false, selfClientId: null, participants: [] },
                cursors: { enabled: false, selfClientId: null, cursors: [] },

                // ✅ NEW
                locks: { enabled: false, selfClientId: null, selfLockedNodeId: null, byNodeId: new Map() },
            }),
            { channels: ["presence", "cursors", "locks"] },
        );
    }

    attachCanvas(svg: SVGSVGElement): void {
        this.assertNotDestroyed();

        this.canvas = svg;

        // viewport는 viewBox를 직접 업데이트 (React 리렌더 X)
        this.viewport = new ViewportController(svg, () => this.scheduleViewportCommit());

        // interaction machine 생성 (broker 제거)
        this.interaction = new InteractionMachine({
            getRootNode: () => this.tree.getRootNode(),
            safeGetNode: (id) => this.tree.safeGetNode(id),
            getChildNodes: (id) => this.tree.getChildNodes(id),
            getAllDescendantIds: (id) => this.tree.getAllDescendantIds(id),

            screenToWorld: (x, y) => this.viewport!.screenToWorld(x, y),

            onPan: (dx, dy) => {
                this.viewport?.panning(dx, dy);
            },

            onMoveNode: (targetId, movingId, direction, side) => {
                this.dispatch({
                    type: "NODE/MOVE",
                    scope: "shared",
                    payload: { targetId, movingId, direction, side },
                    meta: makeMeta({ origin: "ui", layout: "auto" }),
                });
            },

            onDeleteNode: (nodeId) => {
                this.dispatch({
                    type: "NODE/DELETE",
                    scope: "shared",
                    payload: { nodeId },
                    meta: makeMeta({ origin: "ui", layout: "auto" }),
                });
            },

            onSelectNode: (nodeId) => {
                this.setSelection(nodeId);
            },

            emitInteraction: (snap) => {
                this.store.setState((prev) => ({ ...prev, interaction: snap }), { channels: ["interaction"] });
            },

            emitDragSession: (snap) => {
                this.store.setState((prev) => ({ ...prev, dragSession: snap }), { channels: ["dragSession"] });
            },

            dragThreshold: this.opts.config?.interaction?.dragThreshold,
        });

        // ready true
        this.store.setState((prev) => ({ ...prev, ready: true }), { channels: ["graph"] });

        // 초기 1회 layout도 command-like transaction으로 통합(기존 core.initialize 동작과 유사)
        this.adapter.transact(
            () => {
                const patches = computeMindmapLayout({
                    nodes: this.adapter.getMap(),
                    rootId: this.tree.getRootId(),
                    config: this.opts.config?.layout,
                });
                for (const p of patches) this.tree.update(p.nodeId, p.patch);
            },
            { type: "mindmap-init-layout" },
        );
    }

    detachCanvas(): void {
        this.canvas = null;
        this.viewport = null;
        this.interaction = null;

        this.store.setState(
            (prev) => ({
                ...prev,
                ready: false,
                viewport: { x: 0, y: 0, scale: 1 },
                interaction: EMPTY_INTERACTION_SNAPSHOT,
                dragSession: EMPTY_DRAG_SESSION_SNAPSHOT,
            }),
            { channels: ["graph", "viewport", "interaction", "dragSession"] },
        );
        this.detachPresence();
    }

    destroy(): void {
        if (this.destroyed) return;

        this.unsubAdapter?.();
        this.unsubAdapter = null;

        this.adapter.destroy();
        this.detachCanvas();

        this.destroyed = true;
        this.detachPresence();
    }

    getStore() {
        return this.store;
    }

    private isNodeLockedByOther(nodeId: NodeId): boolean {
        const locks = this.store.getState().locks;
        if (!locks.enabled) return false;

        const info = locks.byNodeId.get(nodeId);
        if (!info) return false;

        const selfId = locks.selfClientId;
        if (selfId != null && info.clientId === selfId) return false;

        return true;
    }

    private getLockOwnerName(nodeId: NodeId): string | null {
        const locks = this.store.getState().locks;
        const info = locks.byNodeId.get(nodeId);
        if (!info) return null;
        return info.user?.name ?? null;
    }

    private hasLockedConflictForNodes(
        nodeIds: Iterable<NodeId>,
    ): { conflictNodeId: NodeId; ownerName: string | null } | null {
        for (const id of nodeIds) {
            if (this.isNodeLockedByOther(id)) {
                return { conflictNodeId: id, ownerName: this.getLockOwnerName(id) };
            }
        }
        return null;
    }
    private canApplySharedCommand(cmd: MindmapCommand): { ok: true } | { ok: false; reason: string } {
        const locks = this.store.getState().locks;
        if (!locks.enabled) return { ok: true };

        switch (cmd.type) {
            case "NODE/DELETE":
            case "NODE/UPDATE_CONTENTS": {
                const nodeId = cmd.payload.nodeId;
                if (this.isNodeLockedByOther(nodeId)) {
                    const owner = this.getLockOwnerName(nodeId);
                    return { ok: false, reason: `UPDATE_CONTENTS blocked: ${nodeId} locked by ${owner ?? "someone"}` };
                }
                return { ok: true };
            }

            // ✅ 이동/삭제/추가/리사이즈 등은 전부 허용
            default:
                return { ok: true };
        }
    }

    getState(): MindmapState {
        return this.store.getState();
    }

    // ---- commands ----

    dispatch(cmd: MindmapCommand): void {
        this.assertNotDestroyed();

        try {
            if (cmd.scope === "local") {
                this.applyLocalCommand(cmd);
                return;
            }

            // ✅ lock guard
            const guard = this.canApplySharedCommand(cmd);
            if (!guard.ok) {
                this.opts.onError?.(new Error(guard.reason));
                if (this.opts.debug) console.warn("[LockGuard]", guard.reason, cmd);
                return;
            }

            this.adapter.transact(
                () => {
                    this.applySharedCommand(cmd);

                    const runLayout = (cmd.meta.layout ?? "auto") !== "skip";
                    if (runLayout) {
                        const patches = computeMindmapLayout({
                            nodes: this.adapter.getMap(),
                            rootId: this.tree.getRootId(),
                            config: this.opts.config?.layout,
                        });
                        for (const p of patches) this.tree.update(p.nodeId, p.patch);
                    }
                },
                { type: "mindmap-command", cmdType: cmd.type, meta: cmd.meta },
            );
        } catch (e) {
            this.opts.onError?.(e);
            console.error(e);
        }
    }

    batch(cmds: MindmapCommand[], meta?: Partial<CommandMeta>): void {
        this.assertNotDestroyed();
        if (cmds.length === 0) return;

        const enriched: MindmapCommand[] = cmds.map((c) => ({
            ...c,
            meta: makeMeta({ ...c.meta, ...meta }),
        }));
        const hasShared = enriched.some((c) => c.scope === "shared");
        const runLayout = enriched.some((c) => c.scope === "shared" && (c.meta.layout ?? "auto") !== "skip");

        if (!hasShared) {
            // local only
            for (const c of enriched) this.applyLocalCommand(c);
            return;
        }

        this.adapter.transact(
            () => {
                for (const c of enriched) {
                    if (c.scope === "local") this.applyLocalCommand(c);
                    else this.applySharedCommand(c);
                }

                if (runLayout) {
                    const patches = computeMindmapLayout({
                        nodes: this.adapter.getMap(),
                        rootId: this.tree.getRootId(),
                        config: this.opts.config?.layout,
                    });
                    for (const p of patches) this.tree.update(p.nodeId, p.patch);
                }
            },
            { type: "mindmap-command-batch", count: enriched.length },
        );
    }

    actions = {
        lockNode: (nodeId: NodeId) => {
            const node = this.tree.safeGetNode(nodeId);
            if (!node || node.type === "root") return;
            if (!this.presenceManager) return;
            if (this.isNodeLockedByOther(nodeId)) return;
            this.presenceManager.setLock(nodeId);
        },

        unlockNode: () => {
            this.presenceManager?.setLock(null);
        },
        addNode: (baseId: NodeId, direction: NodeDirection, side: AddNodeDirection, contents?: string) => {
            this.dispatch({
                type: "NODE/ADD",
                scope: "shared",
                payload: { baseId, direction, side, data: contents ? { contents } : undefined },
                meta: makeMeta({ origin: "ui", layout: "auto" }),
            });
        },

        moveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection, side?: AddNodeDirection) => {
            this.dispatch({
                type: "NODE/MOVE",
                scope: "shared",
                payload: { targetId, movingId, direction, side },
                meta: makeMeta({ origin: "ui", layout: "auto" }),
            });
        },

        deleteNode: (nodeId: NodeId) => {
            this.dispatch({
                type: "NODE/DELETE",
                scope: "shared",
                payload: { nodeId },
                meta: makeMeta({ origin: "ui", layout: "auto" }),
            });
        },

        updateNodeSize: (nodeId: NodeId, w: number, h: number) => {
            this.dispatch({
                type: "NODE/RESIZE",
                scope: "shared",
                payload: { nodeId, width: w, height: h },
                meta: makeMeta({ origin: "ui", layout: "auto" }),
            });
        },

        updateNodeContents: (nodeId: NodeId, contents: string) => {
            this.dispatch({
                type: "NODE/UPDATE_CONTENTS",
                scope: "shared",
                payload: { nodeId, contents },
                meta: makeMeta({ origin: "ui", layout: "skip" }),
            });
        },

        selectNode: (nodeId: NodeId | null) => {
            this.setSelection(nodeId);
        },

        startCreating: () => {
            this.interaction?.startCreating();
        },

        cancelInteraction: () => {
            this.store.setState(
                (prev) => ({
                    ...prev,
                    interaction: EMPTY_INTERACTION_SNAPSHOT,
                    dragSession: EMPTY_DRAG_SESSION_SNAPSHOT,
                }),
                { channels: ["interaction", "dragSession"] },
            );
        },
    };

    input = {
        pointerDown: (e: PointerLikeEvent) => {
            this.assertNotDestroyed();
            if (!this.interaction) return;

            const hit = resolveHit(e.target);

            // ✅ 다른 곳 클릭하면 unlock
            const selfLocked = this.store.getState().locks.selfLockedNodeId;
            if (selfLocked) {
                if (hit.kind === "canvas") {
                    this.presenceManager?.setLock(null);
                } else if (hit.kind === "node" && hit.nodeId !== selfLocked) {
                    this.presenceManager?.setLock(null);
                }
            }

            // 기존 로직
            if (hit.kind === "node") {
                if (hit.action?.type === "add-child") {
                    this.actions.addNode(hit.nodeId, "child", hit.action.side);
                    return;
                }
                this.interaction.pointerDown({ kind: "node", nodeId: hit.nodeId }, e);
                return;
            }

            this.interaction.pointerDown({ kind: "canvas" }, e);
        },

        pointerMove: (e: PointerLikeEvent) => {
            this.assertNotDestroyed();
            this.interaction?.pointerMove(e);
            this.presenceManager?.handlePointerMove(e.clientX, e.clientY);
        },

        pointerUp: (e: PointerLikeEvent) => {
            this.assertNotDestroyed();
            this.interaction?.pointerUp();

            const selfLocked = this.store.getState().locks.selfLockedNodeId;
            if (!selfLocked) return;
            if (!this.presenceManager) return;
            const hit = resolveHit(e.target);
            if (hit.kind === "canvas") {
                this.presenceManager.setLock(null);
                return;
            }
            if (hit.kind === "node" && hit.nodeId !== selfLocked) {
                this.presenceManager.setLock(null);
            }
        },

        wheel: (e: WheelLikeEvent) => {
            this.assertNotDestroyed();
            e.preventDefault?.();
            this.viewport?.zoomByWheel(e.deltaY, e.clientX, e.clientY);
            // viewBox 즉시, store viewport는 rAF
        },

        keyDown: (e: KeyLikeEvent) => {
            this.assertNotDestroyed();

            if (e.key === "Delete" || e.key === "Backspace") {
                const selected = this.store.getState().selection.selectedNodeId;
                if (selected) this.actions.deleteNode(selected);
            }
        },

        doubleClick: (e: PointerLikeEvent) => {
            this.assertNotDestroyed();

            const hit = resolveHit(e.target);
            if (hit.kind !== "node") return;

            const node = this.tree.safeGetNode(hit.nodeId);
            if (!node || node.type === "root") return; // root는 lock 금지

            // presence 없으면 lock 불가
            if (!this.presenceManager) return;

            // 다른 사람이 lock 중이면 획득 불가
            if (this.isNodeLockedByOther(hit.nodeId)) return;

            const curSelfLocked = this.store.getState().locks.selfLockedNodeId;

            // toggle
            if (curSelfLocked === hit.nodeId) {
                this.presenceManager.setLock(null);
            } else {
                this.presenceManager.setLock(hit.nodeId);
            }
        },

        resize: () => {
            this.assertNotDestroyed();
            this.viewport?.handleResize();
        },
    };

    private makeInitialState(): MindmapState {
        return {
            ready: false,
            graph: {
                rootId: this.tree?.getRootId?.() ?? ("root" as NodeId),
                nodes: this.adapter?.getMap?.() ?? new Map(),
                revision: 0,
            },
            selection: { selectedNodeId: null },
            viewport: { x: 0, y: 0, scale: 1 },
            interaction: EMPTY_INTERACTION_SNAPSHOT,
            dragSession: EMPTY_DRAG_SESSION_SNAPSHOT,
            presence: { enabled: false, selfClientId: null, participants: [] },
            cursors: { enabled: false, selfClientId: null, cursors: [] },

            locks: {
                enabled: false,
                selfClientId: null,
                selfLockedNodeId: null,
                byNodeId: new Map(),
            },
        };
    }

    private calculateInitialBounds(): Rect {
        return { minX: -10000, maxX: 10000, minY: -10000, maxY: 10000 };
    }

    private applyLocalCommand(cmd: MindmapCommand) {
        switch (cmd.type) {
            case "SELECTION/SET":
                this.setSelection(cmd.payload.nodeId);
                return;

            case "VIEWPORT/SET": {
                const { x, y, scale } = cmd.payload;
                this.viewport?.setViewport(x, y, scale);
                return;
            }

            case "INTERACTION/START_CREATE":
                this.interaction?.startCreating();
                return;

            case "INTERACTION/CANCEL":
                this.actions.cancelInteraction();
                return;

            default:
                return;
        }
    }

    private applySharedCommand(cmd: MindmapCommand) {
        switch (cmd.type) {
            case "NODE/ADD": {
                const { baseId, direction, side, data } = cmd.payload;
                const newId = this.tree.attachTo({ baseNodeId: baseId, direction, addNodeDirection: side });

                if (data?.contents !== undefined) {
                    const node = this.tree.safeGetNode(newId);
                    if (node) {
                        this.tree.update(newId, { data: { ...(node.data ?? {}), contents: data.contents } });
                    }
                }
                return;
            }

            case "NODE/MOVE": {
                const { targetId, movingId, direction, side } = cmd.payload;
                this.tree.moveTo({ baseNodeId: targetId, movingNodeId: movingId, direction, addNodeDirection: side });
                return;
            }

            case "NODE/DELETE": {
                const { nodeId } = cmd.payload;
                this.tree.delete(nodeId);
                return;
            }

            case "NODE/RESIZE": {
                const { nodeId, width, height } = cmd.payload;
                const cur = this.tree.safeGetNode(nodeId);
                if (cur && cur.width === width && cur.height === height) return;
                this.tree.update(nodeId, { width, height });
                return;
            }

            case "NODE/UPDATE_CONTENTS": {
                const { nodeId, contents } = cmd.payload;
                const cur = this.tree.safeGetNode(nodeId);
                if (!cur) return;
                this.tree.update(nodeId, { data: { ...(cur.data ?? {}), contents } });
                return;
            }

            default:
                return;
        }
    }

    /** ✅ Yjs/Mock의 변경 이벤트를 한 곳에서 받아서 store/quadTree 갱신 */
    private handleAdapterChange(change: AdapterChange) {
        // quadtree rebuild(우선 전체)
        this.quadTree.clear();
        this.adapter.getMap().forEach((node) => this.quadTree.insert(node));

        const changedChannels: StoreChannel[] = ["graph"];
        for (const id of change.changedIds) changedChannels.push(`node:${id}` as const);

        // selection 안정화: 선택 노드가 사라졌으면 null
        const selected = this.store.getState().selection.selectedNodeId;
        const selectionCleared = selected ? !this.adapter.get(selected) : false;
        if (selectionCleared) changedChannels.push("selection");

        this.store.setState(
            (prev) => ({
                ...prev,
                graph: {
                    ...prev.graph,
                    rootId: this.tree.getRootId(),
                    nodes: this.adapter.getMap(),
                    revision: prev.graph.revision + 1,
                },
                selection: selectionCleared ? { selectedNodeId: null } : prev.selection,
            }),
            { channels: changedChannels },
        );

        // 무한 루프 방지: "auto-layout" 트랜잭션으로 인한 변경은 무시합니다.
        // 또한 초기화("mindmap-init-layout") 중일 때도 중복 실행을 막습니다.

        const originType = getTxOriginType(change.origin);
        const isLayoutTransaction = originType === "auto" || originType === "mindmap-init-layout";

        if (!isLayoutTransaction) {
            // 1. 현재 구조에 맞는 레이아웃 위치 계산 (x, y 변경이 필요한 노드만 반환됨)
            const patches = computeMindmapLayout({
                nodes: this.adapter.getMap(),
                rootId: this.tree.getRootId(),
                config: this.opts.config?.layout,
            });

            // 2. 변경사항이 있다면 적용 (이때 origin을 'auto-layout'으로 설정하여 루프 방지)
            if (patches.length > 0) {
                this.adapter.transact(
                    () => {
                        for (const p of patches) {
                            this.tree.update(p.nodeId, p.patch);
                        }
                    },
                    { type: "auto" }, // 중요: Origin 태깅
                );
            }
        }
    }

    private refreshGraphChannels(channels: StoreChannel[]) {
        this.store.setState(
            (prev) => ({
                ...prev,
                graph: {
                    ...prev.graph,
                    rootId: this.tree.getRootId(),
                    nodes: this.adapter.getMap(),
                    revision: prev.graph.revision + 1,
                },
            }),
            { channels },
        );
    }

    private setSelection(nodeId: NodeId | null) {
        this.store.setState((prev) => ({ ...prev, selection: { selectedNodeId: nodeId } }), {
            channels: ["selection"],
        });
    }

    private scheduleViewportCommit() {
        if (!this.viewport) return;
        if (this.viewportCommitScheduled) return;
        this.viewportCommitScheduled = true;

        requestAnimationFrame(() => {
            this.viewportCommitScheduled = false;
            const snap = this.viewport?.getSnapshot() ?? { x: 0, y: 0, scale: 1 };

            this.store.setState(
                (prev) => {
                    const cur = prev.viewport;
                    if (cur.x === snap.x && cur.y === snap.y && cur.scale === snap.scale) return prev;
                    return { ...prev, viewport: snap };
                },
                { channels: ["viewport"] },
            );
        });
    }

    private assertNotDestroyed() {
        if (this.destroyed) throw new Error("[MindmapEngine] destroyed");
    }
}
