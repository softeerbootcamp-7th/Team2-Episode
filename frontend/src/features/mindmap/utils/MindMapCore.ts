import { NodeElement, NodeId } from "@/features/mindmap/types/node";
import { MindmapInteractionManager } from "@/features/mindmap/utils/MindmapInteractionManager";
import MindmapLayoutManager from "@/features/mindmap/utils/MindmapLayoutManager";
import Renderer from "@/features/mindmap/utils/Renderer";
import TreeContainer from "@/features/mindmap/utils/TreeContainer";
import QuadTree from "@/features/quad_tree/utils/QuadTree";
import { EventBroker } from "@/utils/EventBroker";

/**
 *  tree : 마인드맵의 계급도
 *  layout : 트리 layout 배치
 *  quadTree : 마우스 주변 노드 후보군 탐색
 *  renderer : 실제 svg 화면 그리기
 *  interaction : 마우스/키보드 조작
 */
export default class MindMapCore {
    private tree: TreeContainer;
    private layout: MindmapLayoutManager;
    private quadTree: QuadTree;
    private renderer: Renderer;
    private interaction: MindmapInteractionManager;

    constructor(canvas: SVGSVGElement, broker: EventBroker<NodeId>) {
        // tree 초기화
        this.tree = new TreeContainer({ broker, quadTreeManager: undefined });
        const rootNode = this.tree.getRootNode();

        // renderer 초기화
        this.renderer = new Renderer(canvas, rootNode, () => this.quadTree.getBounds());

        // quadTree 초기화
        const initialBounds = this.calculateInitialBounds(rootNode);
        this.quadTree = new QuadTree(initialBounds);

        // layout 초기화
        this.layout = new MindmapLayoutManager({ treeContainer: this.tree });

        // interaction 초기화
        this.interaction = new MindmapInteractionManager(
            this.tree,
            () => this.sync(),
            (dx, dy) => this.renderer.panningHandler(dx, dy),
            (target, moving) => this.moveNode(target, moving),
        );
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

    private sync() {
        //TODO: layout -> quadTree -> renderer 순서로 업데이트
    }

    private moveNode(targetId: NodeId, movingId: NodeId) {
        this.tree.moveTo({ baseNodeId: targetId, movingNodeId: movingId, direction: "child" });
        this.sync();
    }
}
