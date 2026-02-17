import { MindmapInteractionManager } from "@/features/mindmap/core/InteractionManager";
import MindmapLayoutManager from "@/features/mindmap/core/LayoutManager";
import QuadTree from "@/features/mindmap/core/QuadTree";
import TreeContainer from "@/features/mindmap/core/TreeContainer";
import ViewportManager from "@/features/mindmap/core/ViewportManager";
import { MindMapEvents } from "@/features/mindmap/types/events";
import { EMPTY_DRAG_SESSION_SNAPSHOT, EMPTY_INTERACTION_SNAPSHOT } from "@/features/mindmap/types/interaction";
import { AddNodeDirection, NodeDirection, NodeId } from "@/features/mindmap/types/node";
import { Bounds } from "@/features/mindmap/types/spatial";
import { EventBroker } from "@/utils/EventBroker";

/**
 *  tree : 마인드맵의 계급도
 *  layout : 트리 layout 배치
 *  quadTree : 마우스 주변 노드 후보군 탐색
 *  viewport : 실제 svg 화면 그리기
 *  interaction : 마우스/키보드 조작
 */
export default class MindMapCore {
    public tree: TreeContainer;
    private broker = new EventBroker<MindMapEvents>();
    private layout: MindmapLayoutManager;

    private canvas: SVGSVGElement | null = null;
    private viewport: ViewportManager | null = null;
    private quadTree: QuadTree | null = null;
    private interaction: MindmapInteractionManager | null = null;

    private _isInitialized = false;
    private contentBoundsCache: Bounds | null = null;

    constructor(private onGlobalUpdate: () => void) {
        this.tree = new TreeContainer();
        this.layout = new MindmapLayoutManager({ treeContainer: this.tree });
    }

    /** 쿼드트리 초기 영역 계산 */
    private calculateInitialBounds() {
        return {
            minX: -10000,
            maxX: 10000,
            minY: -10000,
            maxY: 10000,
        };
    }

    private sync(affectedIds?: NodeId[]) {
        const { quadTree, viewport, _isInitialized } = this;

        if (!_isInitialized || !quadTree || !viewport) return;

        // 영향을 받는 노드들의 레이아웃 캐시 무효화
        if (affectedIds) {
            affectedIds.forEach((id) => {
                this.layout.invalidate(id);
            });

            const targetId = affectedIds[1];
            if (targetId) {
                this.tree.updateDirection({ nodeId: targetId });
            }
        }

        // 1. 레이아웃 업데이트
        const rootId = this.tree.getRootId();
        if (rootId) {
            this.layout.updateLayout({ rootId });
        }

        // 2. 쿼드 트리 갱신
        quadTree.clear();

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        this.tree.nodes.forEach((node) => {
            const left = node.x - node.width / 2;
            const right = node.x + node.width / 2;
            const top = node.y - node.height / 2;
            const bottom = node.y + node.height / 2;

            // bounds 갱신
            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
            if (top < minY) minY = top;
            if (bottom > maxY) maxY = bottom;

            quadTree.insert(node);
        });

        console.log("minX node:", minX, maxX);
        console.log("maxX node:", minY, maxY);

        // cache 저장
        this.contentBoundsCache = {
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
        };

        // 3. broker 알림
        if (affectedIds) {
            affectedIds.forEach((id) => {
                this.broker.publish(id, undefined);
            });
        }
        // 전체 알림
        else {
            this.broker.publish("RENDER_UPDATE", undefined);
        }

        // 4. 전역 UI 업데이트
        this.onGlobalUpdate();
    }

    /** 2단계 결합을 위한 초기화 메서드 */
    initialize(canvas: SVGSVGElement) {
        if (this._isInitialized) return;

        const rootNode = this.tree.getRootNode();
        const initialBounds = this.calculateInitialBounds();

        // 여기서 할당이 완료됨
        this.canvas = canvas;
        this.quadTree = new QuadTree(initialBounds);
        this.viewport = new ViewportManager(
            this.broker,
            canvas,
            rootNode,
            () => this.quadTree!.getBounds(),
            () => this.getContentBounds(),
        );

        this.interaction = new MindmapInteractionManager(
            this.broker,
            this.tree,
            this.quadTree,
            (dx, dy) => {
                if (this.viewport) this.viewport.panningHandler(dx, dy);
            },
            (targetId, moving, direction) => this.moveNode(targetId, moving, direction),
            (x, y) => this.viewport!.screenToWorld(x, y),
            (id) => this.deleteNode(id),
        );

        this._isInitialized = true;
        this.sync();
    }

    getContentBounds() {
        return this.contentBoundsCache;
    }

    handleResize() {
        if (!this.getIsReady) return;
        this.viewport?.handleResize();
    }

    getCanvas(): SVGSVGElement | null {
        return this.canvas;
    }

    moveNode(targetId: NodeId, movingId: NodeId, direction: NodeDirection) {
        this.tree.moveTo({
            baseNodeId: targetId,
            movingNodeId: movingId,
            direction,
        });
        this.sync([targetId, movingId]);
    }

    addNode(baseNodeId: NodeId, direction: NodeDirection, addNodeDirection: AddNodeDirection) {
        const newNodeId = this.tree.attachTo({ baseNodeId, direction: direction, addNodeDirection: addNodeDirection });

        if (newNodeId) {
            this.sync([baseNodeId, newNodeId]);
        }
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
            } else {
                console.error("알 수 없는 삭제 에러 발생");
            }
        }
    }
    getInteractionSnapshot() {
        if (!this._isInitialized || !this.interaction) return EMPTY_INTERACTION_SNAPSHOT;
        return this.interaction.getInteractionSnapshot();
    }

    getDragSessionSnapshot() {
        if (!this._isInitialized || !this.interaction) return EMPTY_DRAG_SESSION_SNAPSHOT;
        return this.interaction.getDragSessionSnapshot();
    }

    updateNodeSize(nodeId: NodeId, width: number, height: number) {
        // 동일 사이즈면 early return
        const cur = this.tree.safeGetNode(nodeId);
        if (cur && cur.width === width && cur.height === height) return;

        this.tree.update({ nodeId, newNodeData: { width, height } });
        this.sync([nodeId]);
    }

    /** ========== Interaction ========== */
    resetViewport() {
        if (!this._isInitialized || !this.viewport) return;

        this.broker.publish("VIEWPORT_RESET", undefined);
    }

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
                const direction = actionEl.getAttribute("data-direction") as AddNodeDirection;
                this.addNode(nodeId, "child", direction);
                return;
            }

            // 노드 본체 클릭 시 (드래그 준비)
            this.broker.publish("NODE_CLICK", { nodeId, event: e });
        } else {
            // 배경 클릭 시 (패닝)
            this.broker.publish("RAW_MOUSE_DOWN", e);
        }
    }

    handleMouseUp(e: React.MouseEvent) {
        this.broker.publish("RAW_MOUSE_UP", e);
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

    getIsReady(): boolean {
        return this._isInitialized;
    }
}
