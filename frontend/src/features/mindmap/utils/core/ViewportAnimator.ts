/**
 * 화면 순간이동을 부드러운 미끄러짐으로 바꿔주는 프레임 조절
 */
export default class ViewportAnimator {
    private animationId: number | null = null;

    constructor(private onUpdate: (x: number, y: number) => void) {}

    public start(getCurrent: () => { x: number; y: number }, target: { x: number; y: number }, easing: number = 0.15) {
        this.stop();

        const loop = () => {
            const current = getCurrent();
            const dx = target.x - current.x;
            const dy = target.y - current.y;

            // 목표치에 근접하면 정지 (0.1px 미만)
            if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                this.onUpdate(target.x, target.y);
                this.animationId = null;
                return;
            }

            const nextX = current.x + dx * easing;
            const nextY = current.y + dy * easing;

            this.onUpdate(nextX, nextY);
            this.animationId = requestAnimationFrame(loop);
        };

        this.animationId = requestAnimationFrame(loop);
    }

    public stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}
