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
            return this.delegateInsert(point);
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

        return this.delegateInsert(point); // 새로 들어온 point도 위임
    }

    /**
     * 노드 삭제
     */
    remove(point: Point): boolean {
        if (!this.contains(point)) {
            return false;
        }

        let removed = false;

        if (this.children) {
            // 자식에게 삭제 위임
            removed = this.delegateRemove(point);

            if (removed) {
                this.tryMerge();
            }
        } else {
            // 내가 leaf 노드라면 직접 삭제
            removed = this.points.delete(point);
        }
        return removed;
    }

    /**
     * 자식 Quad가 가진 점의 개수 총합 < limit 이면, 자식 Quad 삭제(null)하고 다시 부모로 회수
     */
    private tryMerge() {
        if (!this.children) {
            return;
        }

        const totalPoints = this.countAllPoints();

        if (totalPoints <= this.limit) {
            this.collectAllPoints(this.points);
            this.children = null; // 자식 Quad 연결 해제
        }
    }

    /**
     * 현재 노드 이하의 모든 points 개수
     */
    private countAllPoints(): number {
        if (!this.children) {
            return 0;
        }

        const { NW, NE, SW, SE } = this.children;
        return NW.countAllPoints() + NE.countAllPoints() + SW.countAllPoints() + SE.countAllPoints();
    }

    /**
     * 자식 노드들에 흩어진 모든 점을 하나의 Set으로 모으기
     */
    private collectAllPoints(points: Set<Point>) {
        if (!this.children) {
            this.points.forEach((point) => points.add(point));
            return;
        }

        const { NW, NE, SW, SE } = this.children;
        NW.collectAllPoints(points);
        NE.collectAllPoints(points);
        SW.collectAllPoints(points);
        SE.collectAllPoints(points);
    }

    /**
     * 현재 points를 자식 QuadTree로 이동시키기
     *  해당 자식의 Rect에 포함되면 넘긴다.
     */
    moveToChild() {
        this.points.forEach((point) => this.delegateInsert(point));
        this.points.clear();
    }

    private delegateInsert(point: Point): boolean {
        const { NW, NE, SW, SE } = this.children!;

        if (NW.contains(point)) return NW.insert(point);
        if (NE.contains(point)) return NE.insert(point);
        if (SW.contains(point)) return SW.insert(point);
        if (SE.contains(point)) return SE.insert(point);

        return false;
    }

    private delegateRemove(point: Point): boolean {
        const { NW, NE, SW, SE } = this.children!;

        if (NW.contains(point)) return NW.remove(point);
        if (NE.contains(point)) return NE.remove(point);
        if (SW.contains(point)) return SW.remove(point);
        if (SE.contains(point)) return SE.remove(point);

        return false;
    }
}
