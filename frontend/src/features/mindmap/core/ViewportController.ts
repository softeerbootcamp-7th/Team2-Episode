import { Bounds } from "@/shared/types/spatial";

const BASE_MIN_ZOOM = 0.1;
const BASE_MAX_ZOOM = 5;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export class ViewportController {
    private canvas: SVGSVGElement;
    private panX = 0;
    private panY = 0;
    private zoom = 1;
    private rafId: number | null = null;
    private softMinZoom = BASE_MIN_ZOOM;

    constructor(
        canvas: SVGSVGElement,
        // FIX: 이게 무엇일까요?
        private getBounds: () => Bounds | null, // Core의 캐시를 가져오는 함수
        private onChange?: () => void,
    ) {
        this.canvas = canvas;
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

    handleResize() {
        this.applyViewBox();
    }

    resetView(): void {
        this.animateTo(0, 0, 1);
    }

    getSnapshot() {
        return { x: this.panX, y: this.panY, scale: this.zoom };
    }

    setViewport(x: number, y: number, scale?: number) {
        this.panX = x;
        this.panY = y;
        if (scale !== undefined) this.zoom = scale;
        this.applyViewBox();
    }

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

    panning(dx: number, dy: number) {
        this.panX -= dx / this.zoom;
        this.panY -= dy / this.zoom;
        this.applyViewBox();
    }

    zoomByWheel(deltaY: number, clientX: number, clientY: number) {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0) return;

        // 줌 전 마우스 월드 좌표
        const beforeX = this.panX + (clientX - rect.left - rect.width / 2) / this.zoom;
        const beforeY = this.panY + (clientY - rect.top - rect.height / 2) / this.zoom;

        const zoomSpeed = 0.001;
        const scaleChange = Math.exp(-deltaY * zoomSpeed);
        const nextZoom = Math.min(Math.max(this.zoom * scaleChange, 0.1), 5);

        this.zoom = nextZoom;
        this.panX = beforeX - (clientX - rect.left - rect.width / 2) / this.zoom;
        this.panY = beforeY - (clientY - rect.top - rect.height / 2) / this.zoom;

        this.applyViewBox();
    }

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

    panningHandler(dx: number, dy: number): void {
        this.cancelAnimation();
        // 현재 줌 배율에 맞춰 마우스 픽셀 이동량을 World 좌표 이동량으로 변환
        this.panX -= dx / this.zoom;
        this.panY -= dy / this.zoom;

        this.applyViewBox();
    }

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

    private applyViewBox() {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0) return;

        const viewWidth = rect.width / this.zoom;
        const viewHeight = rect.height / this.zoom;

        const minX = this.panX - viewWidth / 2;
        const minY = this.panY - viewHeight / 2;

        this.canvas.setAttribute("viewBox", `${minX} ${minY} ${viewWidth} ${viewHeight}`);
    }
}
