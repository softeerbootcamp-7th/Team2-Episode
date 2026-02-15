import { MindmapInteractionManager } from "@/features/mindmap/core/InteractionManager";
import MindmapLayoutManager from "@/features/mindmap/core/LayoutManager";
import QuadTree from "@/features/mindmap/core/QuadTree";
import TreeContainer from "@/features/mindmap/core/TreeContainer";
import ViewportManager from "@/features/mindmap/core/ViewportManager";
import { MindMapEvents } from "@/features/mindmap/types/events";
import { AddNodeDirection, NodeDirection, NodeId } from "@/features/mindmap/types/node";
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

    // ! 나 ? 없이 사용하기 위해, 초기화 전에는 접근을 막는 구조
    private canvas: SVGSVGElement | null = null;
    private viewport: ViewportManager | null = null;
    private quadTree: QuadTree | null = null;
    private interaction: MindmapInteractionManager | null = null;

    private _isInitialized = false;

    constructor(private onGlobalUpdate: () => void) {
        this.tree = new TreeContainer();
        this.layout = new MindmapLayoutManager({ treeContainer: this.tree });
    }

    /** 2단계 결합을 위한 초기화 메서드 */
    public initialize(canvas: SVGSVGElement) {
        if (this._isInitialized) return;

        const rootNode = this.tree.getRootNode();
        const initialBounds = this.calculateInitialBounds();

        // 여기서 할당이 완료됨
        this.canvas = canvas;
        this.quadTree = new QuadTree(initialBounds);
        this.viewport = new ViewportManager(this.broker, canvas, rootNode, () => this.quadTree!.getBounds());

        this.interaction = new MindmapInteractionManager(
            this.broker,
            this.tree,
            this.quadTree,
            () => this.onGlobalUpdate(),
            (dx, dy) => {
                // 내부 콜백에서도 null 체크 후 실행 (안정성 확보)
                if (this.viewport) this.viewport.panningHandler(dx, dy);
            },
            (target, moving, direction) => this.moveNode(target, moving, direction),
            (x, y) => this.viewport!.screenToWorld(x, y),
        );

        this._isInitialized = true;
        this.sync();
    }

    public get isReady(): boolean {
        return this._isInitialized;
    }

    /** 엔진이 소유하고 있는 SVG 엘리먼트를 반환 */
    public getCanvas(): SVGSVGElement | null {
        return this.canvas;
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
        }

        // 1. 레이아웃 업데이트
        const rootId = this.tree.getRootId();
        if (rootId) {
            this.layout.updateLayout({ rootId });
        }
        console.log("레이아웃 업데이트");

        // 2. 쿼드 트리 갱신
        quadTree.clear();
        this.tree.nodes.forEach((node) => {
            quadTree.insert(node);
        });
        console.log("쿼드 트리 갱신");

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

    getInteractionStatus() {
        if (!this._isInitialized || !this.interaction) {
            return;
        }
        return this.interaction.getInteractionStatus();
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
        const parentId = this.tree.getParentId(nodeId);
        this.tree.delete({ nodeId });
        this.sync(parentId ? [parentId] : undefined);
    }

    updateNodeSize(nodeId: NodeId, width: number, height: number) {
        console.log("사이즈 변함");
        if (!this.interaction) return;
        this.tree.update({ nodeId, newNodeData: { width, height } });
        this.sync([nodeId]);
    }

    /** ========== Interaction ========== */
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
}
