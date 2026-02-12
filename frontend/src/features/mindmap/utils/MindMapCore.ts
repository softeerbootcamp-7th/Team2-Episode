import { MindMapEvents } from "@/features/mindmap/types/events";
import { NodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import { MindmapInteractionManager } from "@/features/mindmap/utils/InteractionManager";
import MindmapLayoutManager from "@/features/mindmap/utils/LayoutManager";
import TreeContainer from "@/features/mindmap/utils/TreeContainer";
import ViewportManager from "@/features/mindmap/utils/ViewportManager";
import QuadTree from "@/features/quad_tree/utils/QuadTree";
import { EventBroker } from "@/utils/EventBroker";

/**
 *  tree : 마인드맵의 계급도
 *  layout : 트리 layout 배치
 *  quadTree : 마우스 주변 노드 후보군 탐색
 *  viewport : 실제 svg 화면 그리기
 *  interaction : 마우스/키보드 조작
 */
export default class MindMapCore {
    // TODO: private으로 하고 getter
    public tree: TreeContainer;
    private broker = new EventBroker<MindMapEvents>();

    private layout: MindmapLayoutManager;
    private viewport: ViewportManager;
    private quadTree: QuadTree;
    private interaction: MindmapInteractionManager;

    constructor(
        canvas: SVGSVGElement,
        private onGlobalUpdate: () => void,
    ) {
        // tree 초기화 (rootNode 정보 얻기 위해 먼저 생성)
        this.tree = new TreeContainer({ broker: this.broker });
        const rootNode = this.tree.getRootNode();

        // quadTree 초기화
        const initialBounds = this.calculateInitialBounds(rootNode);
        this.quadTree = new QuadTree(initialBounds);

        // viewport 초기화
        this.viewport = new ViewportManager(this.broker, canvas, rootNode, () => this.quadTree.getBounds());

        // layout 초기화
        this.layout = new MindmapLayoutManager({ treeContainer: this.tree });

        // interaction 초기화
        this.interaction = new MindmapInteractionManager(
            this.broker,
            this.tree,
            () => this.onGlobalUpdate(),
            (dx, dy) => this.viewport.panningHandler(dx, dy),
            (target, moving, direction) => this.moveNode(target, moving, direction),
        );

        this.sync();
    }

    /** 쿼드트리 초기 영역 계산 */
    private calculateInitialBounds(rootNode: NodeElement) {
        const FACTOR = 20;
        const quadWidth = rootNode.width * FACTOR;
        const quadHeight = rootNode.height * FACTOR;

        return {
            minX: rootNode.x - quadWidth / 2,
            maxX: rootNode.x + quadWidth / 2,
            minY: rootNode.y - quadHeight / 2,
            maxY: rootNode.y + quadHeight / 2,
        };
    }

    private sync(affectedIds?: NodeId[]) {
        // 1. 레이아웃 업데이트
        const rootId = this.tree.getRootId();
        if (rootId) {
            this.layout.updateLayout({ rootId });
        }

        // 2. 쿼드 트리 갱신
        this.quadTree.clear();
        this.tree.nodes.forEach((node) => {
            this.quadTree.insert(node);
        });

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

    addNode(baseNodeId: NodeId, direction: NodeDirection) {
        const newNodeId = this.tree.attachTo({ baseNodeId, direction });

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
        this.broker.publish("RAW_MOUSE_DOWN", e);
    }

    handleMouseUp(e: React.MouseEvent) {
        this.broker.publish("RAW_MOUSE_UP", e);
    }

    getBroker() {
        return this.broker;
    }
}
