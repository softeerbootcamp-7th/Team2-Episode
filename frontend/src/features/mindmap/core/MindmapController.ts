import { CollaborationManager } from "@/features/mindmap/core/CollaborationManager";
import { InteractionMachine } from "@/features/mindmap/core/InteractionMachine";
import QuadTree from "@/features/mindmap/core/QuadTree";
import { TreeModel } from "@/features/mindmap/core/TreeModel";
import { ViewportController } from "@/features/mindmap/core/ViewportController";
import { YjsAdapter } from "@/features/mindmap/core/YjsAdaptor";
import { AwarenessLike, CollaboratorInfo, LockInfo } from "@/features/mindmap/types/mindmap_collaboration";
import { MindmapCommand, MindmapCommandMeta } from "@/features/mindmap/types/mindmap_command";
import {
    AdapterChange,
    IMindmapController,
    MindmapOptions,
    TreeAdapter,
} from "@/features/mindmap/types/mindmap_controller";
import { EMPTY_DRAG_SESSION_SNAPSHOT, EMPTY_INTERACTION_SNAPSHOT } from "@/features/mindmap/types/mindmap_interaction";
import type { AddNodeDirection, NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { computeMindmapLayout } from "@/features/mindmap/utils/compute_mindmap_layout";
import { createMindmapStore, MindmapStoreState, StoreChannel } from "@/features/mindmap/utils/mindmap_store";
import { KeyLikeEvent, PointerLikeEvent, WheelLikeEvent } from "@/shared/types/native_like_event";
import type { Bounds, Rect } from "@/shared/types/spatial";

function getTxOriginType(origin: AdapterChange["origin"]): string | boolean | null {
    if (!origin) return null;
    if (typeof origin === "string") return origin;

    if (typeof origin === "object" && origin !== null && "type" in origin) {
        const typeValue = (origin as { type: unknown }).type;

        if (typeof typeValue === "string" || typeof typeValue === "boolean") {
            return typeValue;
        }
    }

    return null;
}

function cloneNodesMapForLayout(nodes: Map<NodeId, NodeElement>): Map<NodeId, NodeElement> {
    const out = new Map<NodeId, NodeElement>();
    nodes.forEach((node, id) => {
        out.set(id, {
            ...node,
        });
    });
    return out;
}

function makeMeta(partial?: Partial<MindmapCommandMeta>): MindmapCommandMeta {
    return {
        origin: partial?.origin ?? "local",
        timestamp: partial?.timestamp ?? Date.now(),
        txId: partial?.txId,
        userId: partial?.userId,
        layout: partial?.layout ?? "auto",
    };
}

function isAddNodeDirection(x: string | null): x is AddNodeDirection {
    return x === "left" || x === "right";
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

export function createMindmapController(opts: MindmapOptions): MindmapController {
    return new MindmapController(opts);
}

export class MindmapController implements IMindmapController {
    private opts: MindmapOptions;

    private adapter: TreeAdapter;
    private tree: TreeModel;

    private presenceManager: CollaborationManager | null = null;

    private quadTree: QuadTree;
    private canvas: SVGSVGElement | null = null;
    private viewport: ViewportController | null = null;

    private interaction: InteractionMachine | null = null;

    private store = createMindmapStore(this.makeInitialState());

    private unsubAdapter: (() => void) | null = null;

    private destroyed = false;

    private contentBoundsCache: Bounds | null = null;
    private viewportCommitScheduled = false;

    constructor(opts: MindmapOptions) {
        this.opts = opts;

        const roomId = opts.roomId ?? "local";
        const rootContents = opts.rootContents ?? "";

        this.adapter = new YjsAdapter({
            doc: opts.doc,
            roomId,
            rootContents,
        });

        this.tree = new TreeModel(this.adapter);

        this.quadTree = new QuadTree(this.calculateInitialBounds());
        this.rebuildSpatialIndexesAndCacheBounds();

        this.unsubAdapter = this.adapter.onChange((c) => this.handleAdapterChange(c));

        this.refreshGraphChannels(["graph"]);
    }

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

    attachPresence(args: { awareness: AwarenessLike; user: CollaboratorInfo }) {
        this.assertNotDestroyed();
        this.detachPresence();

        const { awareness, user } = args;

        this.store.setState(
            (prev) => ({
                ...prev,
                collaborators: { ...prev.collaborators, enabled: true, selfClientId: awareness.clientID },
                cursors: { ...prev.cursors, enabled: true, selfClientId: awareness.clientID },
                locks: {
                    ...prev.locks,
                    enabled: true,
                    selfClientId: awareness.clientID,
                    selfLockedNodeId: null,
                    byNodeId: new Map(),
                },
            }),
            { channels: ["collaborators", "cursors", "locks"] },
        );

        const diffLockIds = (prevMap: Map<NodeId, LockInfo>, nextMap: Map<NodeId, LockInfo>): NodeId[] => {
            const changed = new Set<NodeId>();

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

            for (const [id] of nextMap.entries()) {
                const prev = prevMap.get(id);
                if (!prev) changed.add(id);
            }

            return Array.from(changed);
        };

        this.presenceManager = new CollaborationManager(
            {
                awareness,
                getCanvasRect: () => this.canvas?.getBoundingClientRect() ?? null,
                screenToWorld: (x, y) => this.viewport!.screenToWorld(x, y),

                commitPresence: (next) => {
                    this.store.setState((prev) => ({ ...prev, collaborators: next }), { channels: ["collaborators"] });
                },

                commitCursors: (next) => {
                    this.store.setState((prev) => ({ ...prev, cursors: next }), { channels: ["cursors"] });
                },

                commitLocks: (next) => {
                    const prev = this.store.getState().locks;
                    const changedIds = diffLockIds(prev.byNodeId, next.byNodeId);

                    const channels: StoreChannel[] = ["locks"];
                    for (const id of changedIds) channels.push(`lock:${id}`);

                    if (prev.selfLockedNodeId && prev.selfLockedNodeId !== next.selfLockedNodeId) {
                        channels.push(`lock:${prev.selfLockedNodeId}`);
                    }
                    if (next.selfLockedNodeId) {
                        channels.push(`lock:${next.selfLockedNodeId}`);
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
                collaborators: { enabled: false, selfClientId: null, participants: [] },
                cursors: { enabled: false, selfClientId: null, cursors: [] },

                locks: { enabled: false, selfClientId: null, selfLockedNodeId: null, byNodeId: new Map() },
            }),
            { channels: ["collaborators", "cursors", "locks"] },
        );
    }

    attachCanvas(svg: SVGSVGElement): void {
        this.assertNotDestroyed();

        this.canvas = svg;

        this.viewport = new ViewportController(
            svg,
            () => this.quadTree.getBounds(),
            () => this.contentBoundsCache,
            () => this.scheduleViewportCommit(),
        );

        this.interaction = new InteractionMachine({
            getRootNode: () => this.tree.getRootNode(),
            safeGetNode: (id) => this.tree.safeGetNode(id),
            getChildNodes: (id) => this.tree.getChildNodes(id),
            getAllDescendantIds: (id) => this.tree.getAllDescendantIds(id),

            screenToWorld: (x, y) => this.viewport!.screenToWorld(x, y),

            onPan: (dx, dy) => {
                this.viewport?.panningHandler(dx, dy);
            },

            onMoveNode: (targetId, movingId, direction, side) => {
                this.dispatch({
                    type: "NODE/MOVE",
                    scope: "remote",
                    payload: { targetId, movingId, direction, side },
                    meta: makeMeta({ origin: "local", layout: "auto" }),
                });
            },

            onDeleteNode: (nodeId) => {
                this.dispatch({
                    type: "NODE/DELETE",
                    scope: "remote",
                    payload: { nodeId },
                    meta: makeMeta({ origin: "local", layout: "auto" }),
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

        this.store.setState((prev) => ({ ...prev, ready: true }), { channels: ["graph"] });

        this.adapter.transact(
            () => {
                const patches = computeMindmapLayout({
                    nodes: cloneNodesMapForLayout(this.adapter.getMap()),
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

            default:
                return { ok: true };
        }
    }

    getState(): MindmapStoreState {
        return this.store.getState();
    }

    dispatch(cmd: MindmapCommand): void {
        this.assertNotDestroyed();

        try {
            if (cmd.scope === "local") {
                this.applyLocalCommand(cmd);
                return;
            }

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
                            rootId: this.tree.getRootId(),
                            nodes: cloneNodesMapForLayout(this.adapter.getMap()),
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

    batch(cmds: MindmapCommand[], meta?: Partial<MindmapCommandMeta>): void {
        this.assertNotDestroyed();
        if (cmds.length === 0) return;

        const enriched: MindmapCommand[] = cmds.map((c) => ({
            ...c,
            meta: makeMeta({ ...c.meta, ...meta }),
        }));
        const hasShared = enriched.some((c) => c.scope === "remote");
        const runLayout = enriched.some((c) => c.scope === "remote" && (c.meta.layout ?? "auto") !== "skip");

        if (!hasShared) {
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
                        nodes: cloneNodesMapForLayout(this.adapter.getMap()),
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
                scope: "remote",
                payload: { baseId, direction, side, data: contents ? { contents } : undefined },
                meta: makeMeta({ origin: "local", layout: "auto" }),
            });
        },

        moveNode: (targetId: NodeId, movingId: NodeId, direction: NodeDirection, side?: AddNodeDirection) => {
            this.dispatch({
                type: "NODE/MOVE",
                scope: "remote",
                payload: { targetId, movingId, direction, side },
                meta: makeMeta({ origin: "local", layout: "auto" }),
            });
        },

        deleteNode: (nodeId: NodeId) => {
            this.dispatch({
                type: "NODE/DELETE",
                scope: "remote",
                payload: { nodeId },
                meta: makeMeta({ origin: "local", layout: "auto" }),
            });
        },

        updateNodeSize: (nodeId: NodeId, w: number, h: number) => {
            this.dispatch({
                type: "NODE/RESIZE",
                scope: "remote",
                payload: { nodeId, width: w, height: h },
                meta: makeMeta({ origin: "local", layout: "auto" }),
            });
        },

        updateNodeContents: (nodeId: NodeId, contents: string) => {
            this.dispatch({
                type: "NODE/UPDATE_CONTENTS",
                scope: "remote",
                payload: { nodeId, contents },
                meta: makeMeta({ origin: "local", layout: "auto" }),
            });
        },

        selectNode: (nodeId: NodeId | null) => {
            this.setSelection(nodeId);
        },

        resetViewport: () => {
            this.viewport?.resetView();
        },

        fitToContent: () => {
            this.viewport?.fitToWorldRect();
        },

        startCreating: () => {
            this.interaction?.startCreating();
        },

        cancelInteraction: () => {
            if (this.interaction) {
                this.interaction.cancel();
                return;
            }

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
            if (this.interaction?.getInteractionMode() === "pending_creation") return;

            this.assertNotDestroyed();
            if (!this.interaction) return;

            const hit = resolveHit(e.target);

            const selfLocked = this.store.getState().locks.selfLockedNodeId;
            if (selfLocked) {
                if (hit.kind === "canvas") {
                    this.presenceManager?.setLock(null);
                } else if (hit.kind === "node" && hit.nodeId !== selfLocked) {
                    this.presenceManager?.setLock(null);
                }
            }

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
        },

        keyDown: (e: KeyLikeEvent) => {
            this.assertNotDestroyed();

            const target = e.target as HTMLElement | null;
            const isEditingText =
                target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

            if (isEditingText) {
                return;
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                const selected = this.store.getState().selection.selectedNodeId;
                if (selected) this.actions.deleteNode(selected);
            }

            if (e.key === "Escape") {
                if (this.interaction?.getInteractionMode() === "pending_creation") {
                    this.actions.cancelInteraction();
                }
                return;
            }

            const key = e.key.toLowerCase();
            const code = e.code;

            // N 키 (한글 'ㅜ')
            if (code === "KeyN" || key === "n" || key === "ㅜ") {
                this.actions.startCreating();
            }
            // F 키 (한글 'ㄹ')
            else if (code === "KeyF" || key === "f" || key === "ㄹ") {
                this.actions.fitToContent();
            }
            // C 키 (한글 'ㅊ')
            else if (code === "KeyC" || key === "c" || key === "ㅊ") {
                this.actions.resetViewport();
            }
        },

        doubleClick: (e: PointerLikeEvent) => {
            this.assertNotDestroyed();

            const hit = resolveHit(e.target);
            if (hit.kind !== "node") return;

            const node = this.tree.safeGetNode(hit.nodeId);
            if (!node || node.type === "root") return;

            if (!this.presenceManager) return;

            if (this.isNodeLockedByOther(hit.nodeId)) return;

            const curSelfLocked = this.store.getState().locks.selfLockedNodeId;

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

    private makeInitialState(): MindmapStoreState {
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
            collaborators: { enabled: false, selfClientId: null, participants: [] },
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

            case "VIEWPORT/FIT_CONTENT": {
                this.viewport?.fitToWorldRect();
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
                    this.tree.update(newId, { contents: data.contents });
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

                this.tree.update(nodeId, { contents });
                return;
            }

            default:
                return;
        }
    }

    private rebuildSpatialIndexesAndCacheBounds() {
        this.quadTree.clear();

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        this.adapter.getMap().forEach((node) => {
            // QuadTree는 drag/탐색용 (기존 유지)
            this.quadTree.insert(node);

            const w = typeof node.width === "number" && node.width > 0 ? node.width : 200;
            const h = typeof node.height === "number" && node.height > 0 ? node.height : 80;

            const left = node.x - w / 2;
            const right = node.x + w / 2;
            const top = node.y - h / 2;
            const bottom = node.y + h / 2;

            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
            if (top < minY) minY = top;
            if (bottom > maxY) maxY = bottom;
        });

        if (minX === Infinity) {
            this.contentBoundsCache = null;
            return;
        }

        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);

        this.contentBoundsCache = { minX, maxX, minY, maxY, width, height };
    }

    private handleAdapterChange(change: AdapterChange) {
        this.rebuildSpatialIndexesAndCacheBounds();

        const changedChannels: StoreChannel[] = ["graph"];
        for (const id of change.changedIds) changedChannels.push(`node:${id}` as const);

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

        const origin = change.origin;
        if (!origin) {
            return;
        }

        const originType = getTxOriginType(origin);
        const isLayoutTransaction = originType === "auto" || originType === "mindmap-init-layout";

        if (isLayoutTransaction) {
            return;
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
