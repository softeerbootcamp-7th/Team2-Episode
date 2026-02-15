import { NodeElement } from "@/features/mindmap/types/node";

/**
 * NOTE(중요):
 * 현재 NodeElement.width/height 는 "노드 전체"(Node.Content + AddNode 포함) bounding-box 기준.
 * 요구사항은 edge/밴드/앵커를 Node.Content 벽 기준으로 해야 하므로,
 * node.width에서 AddNode 영역만큼 제외해 content 벽 좌표를 계산한다.
 *
 * AddNode (Tailwind):
 *  - w-13.5 = 54px
 *  - wrapper gap-2 = 8px
 *  => AddNode + gap 합계 = 62px
 *
 * ⚠️ 스타일 변경 시 이 값도 같이 변경 필요.
 */

const DEFAULT_OUTER_W = 200; // 측정 전 fallback
const DEFAULT_OUTER_H = 60;

export const ADD_NODE_TOTAL_W = 62;

export function getOuterSize(node: NodeElement) {
    return {
        w: node.width || DEFAULT_OUTER_W,
        h: node.height || DEFAULT_OUTER_H,
    };
}

/**
 * Node.Content의 좌/우 벽을 월드 좌표로 반환
 * - root: AddNode가 양쪽에 있다고 가정
 * - normal: addNodeDirection에 따라 왼쪽/오른쪽 한쪽에만 AddNode가 있다고 가정
 */
export function getContentBounds(node: NodeElement) {
    const { w, h } = getOuterSize(node);
    const halfW = w / 2;
    const halfH = h / 2;

    const outerLeft = node.x - halfW;
    const outerRight = node.x + halfW;

    let contentLeft = outerLeft;
    let contentRight = outerRight;

    if (node.type === "root") {
        // 루트는 AddNode가 양쪽 -> 양쪽에서 62px씩 제외
        contentLeft = outerLeft + ADD_NODE_TOTAL_W;
        contentRight = outerRight - ADD_NODE_TOTAL_W;
    } else if (node.addNodeDirection === "right") {
        // AddNode가 오른쪽에 있으니 오른쪽 벽에서 62px 제외
        contentLeft = outerLeft;
        contentRight = outerRight - ADD_NODE_TOTAL_W;
    } else {
        // AddNode가 왼쪽
        contentLeft = outerLeft + ADD_NODE_TOTAL_W;
        contentRight = outerRight;
    }

    return {
        left: contentLeft,
        right: contentRight,
        top: node.y - halfH,
        bottom: node.y + halfH,

        // 디버깅용 outer
        outerLeft,
        outerRight,
        outerTop: node.y - halfH,
        outerBottom: node.y + halfH,
    };
}

/**
 * 부모-자식 edge 앵커:
 * - child가 parent 오른쪽이면 parent.right -> child.left
 * - child가 parent 왼쪽이면 parent.left -> child.right
 */
export function getParentChildEdgeAnchors(parent: NodeElement, child: NodeElement) {
    const p = getContentBounds(parent);
    const c = getContentBounds(child);

    const isRight = child.x >= parent.x;

    return {
        start: { x: isRight ? p.right : p.left, y: parent.y },
        end: { x: isRight ? c.left : c.right, y: child.y },
        isRight,
    };
}
