import { NodeElement } from "@/features/mindmap/types/mindmapType";
import ViewportAnimator from "@/features/mindmap/utils/core/ViewportAnimator";
import { calculateFocusOffset } from "@/features/mindmap/utils/helper/calculate_focus_offset";
import { Rect } from "@/features/quad_tree/types/rect";
import QuadTree from "@/features/quad_tree/utils/QuadTree";

/**
 * Renderer
 * canvas: 화면을 그리는 실제 SVG 엘리먼트
 * qt: 공간 데이터를 관리하는 쿼드 트리 인스턴스
 * bounds: 이동 및 확장이 제한되는 전체 쿼드 트리 영역
 * viewBox: 현재 사용자 화면에 보이는 가상 좌표 영역
 */
export default class Renderer {
    private canvas: SVGSVGElement;
    private qt: QuadTree;
    private bounds: Rect;
    private viewBox: Rect;

    private animator: ViewportAnimator;

    private readonly INITIAL_QUAD_FACTOR = 20; // 쿼드 트리 크기: 루트 노드의 n배
    private readonly INITIAL_VIEW_FACTOR = 6; // 초기 뷰포트 크기: 루트 노드의 n배

    /** [Init] 루트 노드를 중앙에 배치하고 쿼드 트리와 줌인된 초기 뷰포트를 설정 */
    constructor(canvas: SVGSVGElement, rootNode: NodeElement) {
        this.canvas = canvas;

        //쿼드 트리 영역 설정
        const quadW = rootNode.width * this.INITIAL_QUAD_FACTOR;
        const quadH = rootNode.height * this.INITIAL_QUAD_FACTOR;

        this.bounds = {
            minX: rootNode.x - quadW / 2,
            maxX: rootNode.x + quadW / 2,
            minY: rootNode.y - quadH / 2,
            maxY: rootNode.y + quadH / 2,
        };
        this.qt = new QuadTree(this.bounds);

        //초기 카메라 위치 설정
        const rect = this.canvas.getBoundingClientRect();
        const canvasRatio = rect.width / rect.height;

        const viewHeight = rootNode.height * this.INITIAL_VIEW_FACTOR;
        const viewWidth = viewHeight * canvasRatio;

        this.viewBox = {
            minX: rootNode.x - viewWidth / 2,
            maxX: rootNode.x + viewWidth / 2,
            minY: rootNode.y - viewHeight / 2,
            maxY: rootNode.y + viewHeight / 2,
        };

        this.animator = new ViewportAnimator((x, y) => this.updateViewBoxPosition(x, y));
        this.applyViewBox();
    }

    /** 마우스 드래그를 통해 카메라 위치를 이동 */
    panningHandler(dx: number, dy: number): void {
        this.animator.stop();

        const rect = this.canvas.getBoundingClientRect();
        const viewW = this.viewBox.maxX - this.viewBox.minX;
        const viewH = this.viewBox.maxY - this.viewBox.minY;

        // 마우스의 픽셀 이동량(px)을 현재 확대 배율(ViewBox) 기준의 거리로 변환
        const sensitivity = 0.65;
        const worldDx = (dx / rect.width) * viewW * sensitivity;
        const worldDy = (dy / rect.height) * viewH * sensitivity;

        const nextMinX = this.viewBox.minX - worldDx;
        const nextMinY = this.viewBox.minY - worldDy;

        // 경계 제한 후 업데이트
        this.viewBox.minX = Math.max(this.bounds.minX, Math.min(nextMinX, this.bounds.maxX - viewW));
        this.viewBox.minY = Math.max(this.bounds.minY, Math.min(nextMinY, this.bounds.maxY - viewH));
        this.viewBox.maxX = this.viewBox.minX + viewW;
        this.viewBox.maxY = this.viewBox.minY + viewH;

        this.updateViewBoxPosition(this.viewBox.minX - worldDx, this.viewBox.minY - worldDy);
    }

    /** 확대/축소 (마우스 포인터 지점 고정) */
    zoomHandler(delta: number, e: WheelEvent): void {
        this.animator.stop();

        const rect = this.canvas.getBoundingClientRect();
        const currentW = this.viewBox.maxX - this.viewBox.minX;
        const currentH = this.viewBox.maxY - this.viewBox.minY;

        //줌 배율 결정
        const zoomSpeed = 0.001;
        const scaleChange = Math.exp(delta * zoomSpeed);

        let nextW = currentW * scaleChange;
        let nextH = currentH * scaleChange;

        //쿼드 트리 bounds 내로 줌아웃 최대 영역 제한
        const boundsW = this.bounds.maxX - this.bounds.minX;
        const boundsH = this.bounds.maxY - this.bounds.minY;

        if (nextW > boundsW) {
            nextW = boundsW;
            nextH = nextW / (rect.width / rect.height);
        }
        if (nextH > boundsH) {
            nextH = boundsH;
            nextW = nextH * (rect.width / rect.height);
        }

        //마우스 좌표 고정
        const mouseRatioX = (e.clientX - rect.left) / rect.width;
        const mouseRatioY = (e.clientY - rect.top) / rect.height;

        const worldMouseX = this.viewBox.minX + mouseRatioX * currentW;
        const worldMouseY = this.viewBox.minY + mouseRatioY * currentH;

        let nextMinX = worldMouseX - mouseRatioX * nextW;
        let nextMinY = worldMouseY - mouseRatioY * nextH;

        //줌 이후 뷰포트가 경계를 벗어나지 않게 보정
        nextMinX = Math.max(this.bounds.minX, Math.min(nextMinX, this.bounds.maxX - nextW));
        nextMinY = Math.max(this.bounds.minY, Math.min(nextMinY, this.bounds.maxY - nextH));

        this.viewBox = {
            minX: nextMinX,
            minY: nextMinY,
            maxX: nextMinX + nextW,
            maxY: nextMinY + nextH,
        };
        this.applyViewBox();
    }

    /** 클릭한 노드가 화면에 잘 보이도록 계산된 거리만큼 뷰포트 자동 이동 */
    public focusNode(node: NodeElement): void {
        const { diffX, diffY } = calculateFocusOffset(this.viewBox, node);
        if (diffX === 0 && diffY === 0) return;

        // 부드러운 이동 시작
        this.animator.start(() => ({ x: this.viewBox.minX, y: this.viewBox.minY }), {
            x: this.viewBox.minX + diffX,
            y: this.viewBox.minY + diffY,
        });
    }

    /** 뷰포트의 모든 움직임을 최종 검사하여 카메라가 전체 맵 경계 밖으로 나가지 않게 제한 */
    private updateViewBoxPosition(nextMinX: number, nextMinY: number): void {
        const viewW = this.viewBox.maxX - this.viewBox.minX;
        const viewH = this.viewBox.maxY - this.viewBox.minY;

        this.viewBox.minX = Math.max(this.bounds.minX, Math.min(nextMinX, this.bounds.maxX - viewW));
        this.viewBox.minY = Math.max(this.bounds.minY, Math.min(nextMinY, this.bounds.maxY - viewH));
        this.viewBox.maxX = this.viewBox.minX + viewW;
        this.viewBox.maxY = this.viewBox.minY + viewH;
        this.applyViewBox();
    }

    /** [Apply] 계산된 viewBox 데이터를 실제 SVG viewBox 속성 형식으로 변환하여 적용 */
    private applyViewBox(): void {
        const width = this.viewBox.maxX - this.viewBox.minX;
        const height = this.viewBox.maxY - this.viewBox.minY;
        this.canvas.setAttribute("viewBox", `${this.viewBox.minX} ${this.viewBox.minY} ${width} ${height}`);
    }
}
