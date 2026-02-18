import type {JobConsumer} from '../infrastructure/JobConsumer';
import type {SnapshotService} from '../services/SnapshotService';
import wait from "waait";

export class SnapshotWorker {
    private running = false;

    constructor(
        private readonly deps: {
            consumer: JobConsumer;
            service: SnapshotService;
            blockMs: number;
            count?: number;
        }
    ) {
    }

    async init(): Promise<void> {
        await this.deps.consumer.init();
    }

    async start(): Promise<void> {
        this.running = true;

        while (this.running) {
            try {
                const jobs = await this.deps.consumer.read(this.deps.blockMs, this.deps.count);
                if (!jobs || jobs.length === 0) {
                    console.log("no job");
                    continue;
                }
                for (const job of jobs) {
                    try {
                        await this.deps.service.process(job);
                        await this.deps.consumer.ack([job.entryId]);
                    } catch (error) {
                        console.error(`[Worker] 저장 실패! roomId: ${job.roomId}`, error);
                    }
                }
                await wait(3000); //todo: redis block 관련 로직 구현 후 삭제
            } catch (e) {
                console.error('[Worker] 전역 Error:', e);
                await wait(this.deps.blockMs);
            }
        }
    }

    stop(): void {
        this.running = false;
    }
}
