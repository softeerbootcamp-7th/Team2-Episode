export class ViewportController {
    private canvas: SVGSVGElement;
    private panX = 0;
    private panY = 0;
    private zoom = 1;

    constructor(
        canvas: SVGSVGElement,
        private onChange?: () => void,
    ) {
        this.canvas = canvas;
        this.applyViewBox();
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

    handleResize() {
        this.applyViewBox();
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

    private applyViewBox() {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0) return;

        const viewWidth = rect.width / this.zoom;
        const viewHeight = rect.height / this.zoom;

        const minX = this.panX - viewWidth / 2;
        const minY = this.panY - viewHeight / 2;

        this.canvas.setAttribute("viewBox", `${minX} ${minY} ${viewWidth} ${viewHeight}`);
        this.onChange?.();
    }
}
