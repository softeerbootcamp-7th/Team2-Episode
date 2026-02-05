import { Point } from "@/features/quad_tree/types/point";
import { Rect } from "@/features/quad_tree/types/rect";

/**
 * QuadTree
 *  bounds: Quad 객체가 담당하는 영역
 *  points: 현재 Quad에 저장된 노드
 *  limit: bounds에 저장할 수 있는 최대 노드 수
 *  children: 자식 쿼드
 */
export default class QuadTree {
    private bounds: Rect;
    private points: Set<Point> = new Set();
    private limit: number;
    private children: {
        NW: QuadTree;
        NE: QuadTree;
        SW: QuadTree;
        SE: QuadTree;
    } | null = null;

    constructor(bounds: Rect, limit: number) {
        this.bounds = bounds;
        this.limit = limit;
    }

    /**
     * 4개의 영역으로 쪼개기
     */
    split() {
        const { minX, maxX, minY, maxY } = this.bounds;

        const midY = (minY + maxY) / 2;
        const midX = (minX + maxX) / 2;

        const nwBounds: Rect = { minX, maxX: midX, minY, maxY: midY };
        const neBounds: Rect = { minX: midX, maxX, minY, maxY: midY };
        const swBounds: Rect = { minX, maxX: midX, minY: midY, maxY };
        const seBounds: Rect = { minX: midX, maxX, minY: midY, maxY };

        this.children = {
            NW: new QuadTree(nwBounds, this.limit),
            NE: new QuadTree(neBounds, this.limit),
            SW: new QuadTree(swBounds, this.limit),
            SE: new QuadTree(seBounds, this.limit),
        };
    }

    /**
     *  현재 영역에 point 노드가 있는지 판별
     */
    contains(point: Point) {
        return (
            this.bounds.minX <= point.x &&
            point.x <= this.bounds.maxX &&
            this.bounds.minY <= point.y &&
            point.y <= this.bounds.maxY
        );
    }

    /**
     * 노드를 이동한 이후에 이동한 영역으로 기존 노드를 이동시키기
     */
    insert(point: Point): boolean {
        // 이 영역에 없다면
        if (!this.contains(point)) {
            return false;
        }
        // 자식 Quad가 있으면 -> 이미 4개 초과했다는 것이므로 자식 Quad 로 위임하기
        // TODO : 이때 자식의 어디로 갈지 판단
        if (this.children) {
            return this.delegate(point);
        }

        // 자식 Quad 가 없다면
        // 자식 노드 개수 < 최대 개수
        if (this.points.size < this.limit) {
            this.points.add(point);
            return true;
        }
        // 자식 노드 꽉 찼다면 분할 후 이사
        this.split(); // 자식 Quad 생성
        this.moveToChild(); // 기존 Quad에 있는 points -> 자식 Quad로 복사

        return this.delegate(point); // 새로 들어온 point도 위임
    }

    // 현재 points에 추가
    add(point: Point) {
        this.points.add(point);
    }

    /**
     * 현재 points를 자식 QuadTree로 이동시키기
     *  해당 자식의 Rect에 포함되면 넘긴다.
     */
    moveToChild() {
        this.points.forEach((point) => this.delegate(point));
        this.points.clear();
    }

    private delegate(point: Point): boolean {
        const { NW, NE, SW, SE } = this.children!;

        if (NW.contains(point)) return NW.insert(point);
        if (NE.contains(point)) return NE.insert(point);
        if (SW.contains(point)) return SW.insert(point);
        if (SE.contains(point)) return SE.insert(point);

        return false;
    }
}
