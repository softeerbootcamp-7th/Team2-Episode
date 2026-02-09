import { NodeElement } from "@/features/mindmap/types/mindmapType";
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
    private viewBox: Rect;

    private readonly INITIAL_QUAD_FACTOR = 20; // 쿼드 트리 크기: 루트 노드의 n배
    private readonly INITIAL_VIEW_FACTOR = 6; // 초기 뷰포트 크기: 루트 노드의 n배

    /** [Init] 루트 노드를 중앙에 배치하고 쿼드 트리와 줌인된 초기 뷰포트를 설정 */
    constructor(canvas: SVGSVGElement, rootNode: NodeElement) {
        this.canvas = canvas;

        //쿼드 트리 영역 설정
        const quadW = rootNode.width * this.INITIAL_QUAD_FACTOR;
        const quadH = rootNode.height * this.INITIAL_QUAD_FACTOR;

        const initialBounds = {
            minX: rootNode.x - quadW / 2,
            maxX: rootNode.x + quadW / 2,
            minY: rootNode.y - quadH / 2,
            maxY: rootNode.y + quadH / 2,
        };
        this.qt = new QuadTree(initialBounds);

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

        this.applyViewBox();
    }

    /** 마우스 드래그를 통해 카메라 위치를 이동 */
    panningHandler(dx: number, dy: number): void {
        const rect = this.canvas.getBoundingClientRect();
        const viewW = this.viewBox.maxX - this.viewBox.minX;
        const viewH = this.viewBox.maxY - this.viewBox.minY;

        // 마우스의 픽셀 이동량(px)을 현재 확대 배율(ViewBox) 기준의 거리로 변환
        const sensitivity = 0.65;
        const worldDx = (dx / rect.width) * viewW * sensitivity;
        const worldDy = (dy / rect.height) * viewH * sensitivity;

        this.updateViewBox(this.viewBox.minX - worldDx, this.viewBox.minY - worldDy, viewW, viewH);
    }

    /** 확대/축소 (마우스 포인터 지점 고정) */
    zoomHandler(delta: number, e: { clientX: number; clientY: number }): void {
        const rect = this.canvas.getBoundingClientRect();
        const currentW = this.viewBox.maxX - this.viewBox.minX;
        const currentH = this.viewBox.maxY - this.viewBox.minY;

        //줌 배율 결정
        const zoomSpeed = 0.001;
        const scaleChange = Math.exp(delta * zoomSpeed);

        let nextW = currentW * scaleChange;
        let nextH = currentH * scaleChange;

        //쿼드 트리 bounds 내로 줌아웃 최대 영역 제한
        const currentBounds = this.qt.getBounds();
        const boundsW = currentBounds.maxX - currentBounds.minX;
        const boundsH = currentBounds.maxY - currentBounds.minY;

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

        const nextMinX = worldMouseX - mouseRatioX * nextW;
        const nextMinY = worldMouseY - mouseRatioY * nextH;

        this.updateViewBox(nextMinX, nextMinY, nextW, nextH);
    }

    /** 뷰포트의 위치와 크기를 최종 확정 */
    private updateViewBox(nextMinX: number, nextMinY: number, width: number, height: number): void {
        // 매번 현재 쿼드 트리 최신 크기 참조
        const currentBounds = this.qt.getBounds();

        this.viewBox.minX = Math.max(currentBounds.minX, Math.min(nextMinX, currentBounds.maxX - width));
        this.viewBox.minY = Math.max(currentBounds.minY, Math.min(nextMinY, currentBounds.maxY - height));
        this.viewBox.maxX = this.viewBox.minX + width;
        this.viewBox.maxY = this.viewBox.minY + height;

        this.applyViewBox();
    }

    /** [Apply] 계산된 viewBox 데이터를 실제 SVG viewBox 속성 형식으로 변환하여 적용 */
    private applyViewBox(): void {
        const width = this.viewBox.maxX - this.viewBox.minX;
        const height = this.viewBox.maxY - this.viewBox.minY;
        this.canvas.setAttribute("viewBox", `${this.viewBox.minX} ${this.viewBox.minY} ${width} ${height}`);
    }
}
