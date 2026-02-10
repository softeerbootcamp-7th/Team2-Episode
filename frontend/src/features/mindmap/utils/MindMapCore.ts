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
        // tree 초기화 (rootNode 정보 얻기 위해 먼저 생성)
        this.tree = new TreeContainer({ broker, quadTreeManager: undefined });
        const rootNode = this.tree.getRootNode();

        // quadTree 초기화
        const initialBounds = this.calculateInitialBounds(rootNode);
        this.quadTree = new QuadTree(initialBounds);

        // 실제 트리 업데이트
        this.tree = new TreeContainer({
            quadTreeManager: this.quadTree,
            broker,
        });

        // renderer 초기화
        this.renderer = new Renderer(canvas, rootNode, () => this.quadTree.getBounds());

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
        // 1. 레이아웃 업데이트
        const rootId = this.tree.getRootId();
        this.layout.updateLayout({ rootId });

        // 2. 쿼드 트리 반영
        this.quadTree.clear();
        this.tree.nodes.forEach((node) => {
            this.quadTree.insert(node);
        });

        // 3. 노드 추가, etc 등 카메라를 이동시키거나 줌 조절한다면 renderer에 반영
    }

    private moveNode(targetId: NodeId, movingId: NodeId) {
        this.tree.moveTo({ baseNodeId: targetId, movingNodeId: movingId, direction: "child" });
        this.sync();
    }
}
