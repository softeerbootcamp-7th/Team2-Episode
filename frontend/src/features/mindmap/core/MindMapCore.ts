import * as Y from "yjs";

import { MindmapInteractionManager } from "@/features/mindmap/core/InteractionManager";
import MindmapLayoutManager from "@/features/mindmap/core/LayoutManager";
import QuadTree from "@/features/mindmap/core/QuadTree";
import TreeContainer from "@/features/mindmap/core/TreeContainer";
import type { MindmapTree } from "@/features/mindmap/core/types";
import ViewportManager from "@/features/mindmap/core/ViewportManager";
import YjsTreeContainer from "@/features/mindmap/core/YjsTreeContainer";
import { MindMapEvents } from "@/features/mindmap/types/mindmap_events";
import { EMPTY_DRAG_SESSION_SNAPSHOT, EMPTY_INTERACTION_SNAPSHOT } from "@/features/mindmap/types/mindmap_interaction";
import { AddNodeDirection, NodeDirection, NodeId } from "@/features/mindmap/types/node";
import { EventBroker } from "@/utils/EventBroker";

export default class MindMapCore {
    public tree: MindmapTree;
    private broker = new EventBroker<MindMapEvents>();
    private layout: MindmapLayoutManager;

    private canvas: SVGSVGElement | null = null;
    private viewport: ViewportManager | null = null;
    private quadTree: QuadTree | null = null;
    private interaction: MindmapInteractionManager | null = null;

    private _isInitialized = false;

    constructor(
        private onGlobalUpdate: () => void,
        opts?: { doc?: Y.Doc; roomId?: string; name?: string },
    ) {
        const doc = opts?.doc;
        const roomId = opts?.roomId ?? "local";
        const name = opts?.name ?? "";

        this.tree = doc
            ? new YjsTreeContainer({
                  doc,
                  roomId,
                  broker: this.broker,
                  name,
                  onRemoteChange: (changedIds) => this.syncFromRemote(changedIds),
              })
            : new TreeContainer({ name });

        this.layout = new MindmapLayoutManager({ treeContainer: this.tree });
    }

    destroy() {
        this.tree.destroy?.();
    }

    private calculateInitialBounds() {
        return { minX: -10000, maxX: 10000, minY: -10000, maxY: 10000 };
    }

    /** ✅ remote에서 doc이 바뀌면: layout 다시 쓰지 말고(quadratic loop 방지) 렌더/쿼드트리만 갱신 */
    private syncFromRemote(changedIds: NodeId[]) {
        if (!this._isInitialized || !this.quadTree) return;

        changedIds.forEach((id) => this.layout.invalidate(id));

        this.quadTree.clear();
        this.tree.nodes.forEach((node) => this.quadTree!.insert(node));

        // static layer 갱신을 위해
        this.onGlobalUpdate();
    }

    private sync(affectedIds?: NodeId[]) {
        const { quadTree, viewport, _isInitialized } = this;
        if (!_isInitialized || !quadTree || !viewport) return;

        if (affectedIds) affectedIds.forEach((id) => this.layout.invalidate(id));

        // ✅ layout은 “한 트랜잭션”으로 묶어서 yjs update가 한번에 가게
        this.tree.transact(() => {
            const rootId = this.tree.getRootId();
            if (rootId) this.layout.updateLayout({ rootId });
        }, "core-layout");

        quadTree.clear();
        this.tree.nodes.forEach((node) => quadTree.insert(node));

        if (affectedIds) affectedIds.forEach((id) => this.broker.publish(id, undefined));
        else this.broker.publish("RENDER_UPDATE", undefined);

        this.onGlobalUpdate();
    }

    initialize(canvas: SVGSVGElement) {
        if (this._isInitialized) return;

        const rootNode = this.tree.getRootNode();
        const initialBounds = this.calculateInitialBounds();

        this.canvas = canvas;
        this.quadTree = new QuadTree(initialBounds);
        this.viewport = new ViewportManager(this.broker, canvas, rootNode, () => this.quadTree!.getBounds());

        this.interaction = new MindmapInteractionManager(
            this.broker,
            this.tree,
            this.quadTree,
            (dx, dy) => this.viewport?.panningHandler(dx, dy),
            (target, moving, direction, side) => this.moveNode(target, moving, direction, side),
            (x, y) => this.viewport!.screenToWorld(x, y),
            (id) => this.deleteNode(id),
        );

        this._isInitialized = true;
        this.sync();
    }

    // ---- actions ----

    moveNode(targetId: NodeId, movingId: NodeId, direction: NodeDirection, addNodeDirection?: AddNodeDirection) {
        this.tree.moveTo({ baseNodeId: targetId, movingNodeId: movingId, direction, addNodeDirection });
        this.sync([targetId, movingId]);
    }

    addNode(baseNodeId: NodeId, direction: NodeDirection, addNodeDirection: AddNodeDirection) {
        const newNodeId = this.tree.attachTo({ baseNodeId, direction, addNodeDirection });
        if (newNodeId) this.sync([baseNodeId, newNodeId]);
    }

    deleteNode(nodeId: NodeId) {
        try {
            const parentId = this.tree.getParentId(nodeId);
            this.tree.delete({ nodeId });
            this.sync(parentId ? [parentId] : undefined);
        } catch (error) {
            if (error instanceof Error) {
                console.error(error.message);
                this.broker.publish("NODE_DELETE_ERROR", error.message);
            }
        }
    }

    updateNodeSize(nodeId: NodeId, width: number, height: number) {
        const cur = this.tree.safeGetNode(nodeId);
        if (cur && cur.width === width && cur.height === height) return;

        this.tree.update({ nodeId, newNodeData: { width, height } });
        this.sync([nodeId]);
    }

    // ---- getters / broker ----
    getCanvas() {
        return this.canvas;
    }
    getBroker() {
        return this.broker;
    }
    getTree() {
        return this.tree;
    }
    getViewport() {
        return this.viewport;
    }
    getLayout() {
        return this.layout;
    }
    getIsReady() {
        return this._isInitialized;
    }

    getInteractionSnapshot() {
        if (!this._isInitialized || !this.interaction) return EMPTY_INTERACTION_SNAPSHOT;
        return this.interaction.getInteractionSnapshot();
    }
    getDragSessionSnapshot() {
        if (!this._isInitialized || !this.interaction) return EMPTY_DRAG_SESSION_SNAPSHOT;
        return this.interaction.getDragSessionSnapshot();
    }

    // input handlers는 기존 그대로
    handleMouseMove(e: React.MouseEvent) {
        this.broker.publish("RAW_MOUSE_MOVE", e);
    }
    handleWheel(e: React.WheelEvent) {
        this.broker.publish("RAW_WHEEL", e);
    }
    handleMouseDown(e: React.MouseEvent) {
        const target = e.target as HTMLElement;
        const nodeEl = target.closest("[data-node-id]");

        if (nodeEl) {
            const nodeId = nodeEl.getAttribute("data-node-id")!;
            const actionEl = target.closest("[data-action]");

            if (actionEl && actionEl.getAttribute("data-action") === "add-child") {
                const dir = actionEl.getAttribute("data-direction") as AddNodeDirection;
                this.addNode(nodeId, "child", dir);
                return;
            }
            this.broker.publish("NODE_CLICK", { nodeId, event: e });
        } else {
            this.broker.publish("RAW_MOUSE_DOWN", e);
        }
    }
    handleMouseUp(e: React.MouseEvent) {
        this.broker.publish("RAW_MOUSE_UP", e);
    }
}
