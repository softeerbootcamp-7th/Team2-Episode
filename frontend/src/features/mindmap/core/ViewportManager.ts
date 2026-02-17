import { MindMapEvents } from "@/features/mindmap/types/events";
import { NodeElement } from "@/features/mindmap/types/node";
import { Bounds, Rect } from "@/features/mindmap/types/spatial";
import { EventBroker } from "@/utils/EventBroker";

// 원래 wheel이 가지는 정책상 최소 줌 값 (복구하기 위해 필요)
const BASE_MIN_ZOOM = 0.1;
const BASE_MAX_ZOOM = 5;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/**
 * 카메라
 *  canvas: 화면을 그리는 실제 SVG 엘리먼트
 *  bounds: 이동 및 확장이 제한되는 전체 쿼드 트리 영역
 *  viewBox: 현재 사용자 화면에 보이는 가상 좌표 영역
 */
export default class ViewportManager {
    private panX: number = 0;
    private panY: number = 0;
    private zoom: number = 1;
    private rafId: number | null = null;
    private softMinZoom = BASE_MIN_ZOOM;

    /** [Init] 루트 노드를 중앙에 배치하고 쿼드 트리와 줌인된 초기 뷰포트를 설정 */
    constructor(
        private broker: EventBroker<MindMapEvents>,
        private canvas: SVGSVGElement,
        private rootNode: NodeElement,
        private getWorldBounds: () => Rect,
        private getBounds: () => Bounds | null, // Core의 캐시를 가져오는 함수
    ) {
        this.setupEventListeners();
        this.applyViewBox();
    }

    private cancelAnimation() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private animateTo(targetPanX: number, targetPanY: number, targetZoom: number, duration: number = 320) {
        this.cancelAnimation(); // 이전 애니메이션이 있다면 중단

        const startPanX = this.panX;
        const startPanY = this.panY;
        const startZoom = this.zoom;
        const startTime = performance.now();

        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const k = easeOutCubic(progress);

            // 보간법(Interpolation) 적용
            this.panX = startPanX + (targetPanX - startPanX) * k;
            this.panY = startPanY + (targetPanY - startPanY) * k;
            this.zoom = startZoom + (targetZoom - startZoom) * k;

            this.applyViewBox();

            if (progress < 1) {
                this.rafId = requestAnimationFrame(step);
            } else {
                this.rafId = null;
            }
        };

        this.rafId = requestAnimationFrame(step);
    }

    /** broker 통한 명령 구독 */
    private setupEventListeners() {
        // Panning 명령 수신
        this.broker.subscribe({
            key: "VIEWPORT_PAN",
            callback: ({ dx, dy }) => this.panningHandler(dx, dy),
        });

        // Zoom 명령 수신
        this.broker.subscribe({
            key: "VIEWPORT_ZOOM",
            callback: ({ delta, clientX, clientY }) => this.zoomHandler(delta, { clientX, clientY }),
        });

        // 브라우저 휠 이벤트 직접 수신 (Core에서 쏘는 경우)
        this.broker.subscribe({
            key: "RAW_WHEEL",
            callback: (e) => {
                const wheelEvent = e as WheelEvent;
                this.zoomHandler(wheelEvent.deltaY, { clientX: wheelEvent.clientX, clientY: wheelEvent.clientY });
            },
        });

        this.broker.subscribe({
            key: "VIEWPORT_RESET",
            callback: () => this.resetView(),
        });

        this.broker.subscribe({
            key: "VIEWPORT_FIT_CONTENT",
            callback: () => this.fitToWorldRect(),
        });
    }

    // 전체 마인드맵 영역으로 fit
    fitToWorldRect() {
        const bounds = this.getBounds();
        const cw = this.canvas.clientWidth;
        const ch = this.canvas.clientHeight;

        // 1. 가드 클로즈: 필요한 데이터가 없으면 즉시 종료
        if (!bounds || cw === 0 || ch === 0) return;

        // 2. 패딩을 포함한 실제 타겟 영역 크기 (의미 단위 분리)
        const targetWidth = bounds.width * 1.1;
        const targetHeight = bounds.height * 1.1;

        // 3. 가로/세로 각각의 적정 배율 계산
        const zoomX = cw / targetWidth;
        const zoomY = ch / targetHeight;

        // 4. 최종 줌 결정 (둘 중 작은 값을 선택해야 영역이 잘리지 않음)
        const newZoom = Math.min(zoomX, zoomY, BASE_MAX_ZOOM);

        // 5. 줌 하한선 정책 업데이트 및 이동 시작
        this.softMinZoom = Math.min(BASE_MIN_ZOOM, newZoom);

        const centerX = bounds.minX + bounds.width / 2;
        const centerY = bounds.minY + bounds.height / 2;

        this.animateTo(centerX, centerY, newZoom, 400);
    }

    /** 항상 카메라 중심(panX, panY)을 기준으로 계산 -> svg 반영 */
    applyViewBox(): void {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0) return;

        // 1. 현재 줌 배율에 따라 화면에 보여줄 World 단위의 너비/높이 계산
        const viewWidth = rect.width / this.zoom;
        const viewHeight = rect.height / this.zoom;

        // 2. 카메라 중심(panX, panY)에서 시야의 절반만큼 이동하여 왼쪽 상단(minX, minY) 결정
        const minX = this.panX - viewWidth / 2;
        const minY = this.panY - viewHeight / 2;

        this.canvas.setAttribute("viewBox", `${minX} ${minY} ${viewWidth} ${viewHeight}`);

        // 리액트 등 외부 레이어에 변경 알림
        // this.broker.publish("VIEWPORT_CHANGED", this.getCurrentTransform());
    }

    /** 마우스 드래그: 카메라의 중심점(panX, panY)을 이동 */
    panningHandler(dx: number, dy: number): void {
        this.cancelAnimation();
        // 현재 줌 배율에 맞춰 마우스 픽셀 이동량을 World 좌표 이동량으로 변환
        this.panX -= dx / this.zoom;
        this.panY -= dy / this.zoom;

        this.applyViewBox();
    }

    /** 줌 핸들러: 마우스 포인터 지점을 고정하며 줌 인/아웃 */
    zoomHandler(delta: number, e: { clientX: number; clientY: number }): void {
        this.cancelAnimation();
        const rect = this.canvas.getBoundingClientRect();

        // 1. 줌 전의 마우스 월드 좌표 계산
        const beforeZoomMouseX = this.panX + (e.clientX - rect.left - rect.width / 2) / this.zoom;
        const beforeZoomMouseY = this.panY + (e.clientY - rect.top - rect.height / 2) / this.zoom;

        // 2. 줌 배율 변경
        const zoomSpeed = 0.001;
        const scaleChange = Math.exp(-delta * zoomSpeed); // 휠 방향 보정

        const rawZoom = this.zoom * scaleChange;

        const nextZoom = Math.min(BASE_MAX_ZOOM, Math.max(rawZoom, this.softMinZoom));

        this.zoom = nextZoom;

        this.panX = beforeZoomMouseX - (e.clientX - rect.left - rect.width / 2) / this.zoom;
        this.panY = beforeZoomMouseY - (e.clientY - rect.top - rect.height / 2) / this.zoom;

        // BASE_MIN 복구
        if (this.zoom >= BASE_MIN_ZOOM) {
            this.softMinZoom = BASE_MIN_ZOOM;
        }
        this.applyViewBox();
    }

    /** 현재 카메라 상태 반환 (NodeItem 등에 전달될 값) */
    getCurrentTransform() {
        const rect = this.canvas.getBoundingClientRect();
        const viewWidth = rect.width / this.zoom;
        const viewHeight = rect.height / this.zoom;

        return {
            x: -(this.panX - viewWidth / 2),
            y: -(this.panY - viewHeight / 2),
            scale: this.zoom,
        };
    }

    /** 외부(ResizeObserver)에서 호출할 수 있도록 제공 */
    handleResize() {
        this.applyViewBox();
    }

    resetView(): void {
        this.animateTo(0, 0, 1);
    }

    /**
     * Screen(clientX/clientY) → World(viewBox 좌표) 변환.
     *  node.x/y, QuadTree 탐색 범위는 모두 "World 좌표"를 사용
     *  viewBox를 기준으로 변환하므로 pan/zoom 상태가 자동 반영
     */
    screenToWorld(clientX: number, clientY: number) {
        const rect = this.canvas.getBoundingClientRect();
        const vb = this.canvas.viewBox.baseVal;

        const scaleX = rect.width / vb.width;
        const scaleY = rect.height / vb.height;

        return {
            x: vb.x + (clientX - rect.left) / scaleX,
            y: vb.y + (clientY - rect.top) / scaleY,
        };
    }
}
