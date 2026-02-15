import type {JobConsumer} from '../infrastructure/JobConsumer';
import type {SnapshotService} from '../services/SnapshotService';

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
            // todo: consumer 읽기
            // todo: 읽어온 job 기준으로 snapshot 처리
            // todo: job ack 처리
        }
    }

    stop(): void {
        this.running = false;
    }
}
