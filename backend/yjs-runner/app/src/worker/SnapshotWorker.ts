import type { JobConsumer } from "../infrastructure/JobConsumer";
import type { SnapshotService } from "../services/SnapshotService";
import wait from "waait";

export class SnapshotWorker {
	private running = false;

	constructor(
		private readonly deps: {
			consumer: JobConsumer;
			service: SnapshotService;
			blockMs: number;
			count?: number;
		},
	) {}

	async init(): Promise<void> {
		await this.deps.consumer.init();
	}

	async start(): Promise<void> {
		this.running = true;

		while (this.running) {
			try {
				const jobs = await this.deps.consumer.read(
					this.deps.blockMs,
					this.deps.count,
				);
				if (!jobs || jobs.length === 0) continue;

				const successIds: string[] = [];

				for (const job of jobs) {
					try {
						await this.deps.service.process(job);
						successIds.push(job.entryId);
						console.log(
							`[Worker] ${job.type} Job 처리 완료 entryId: ${job.entryId}  roomId: ${job.roomId}`,
						);
					} catch (error) {
						console.error(
							`[Worker] ${job.type} Job 처리 실패! entryId: ${job.entryId}  roomId: ${job.roomId}`,
							error,
						);
					}
				}

				if (successIds.length) {
					await this.deps.consumer.ack(successIds);
					await this.deps.consumer.del(successIds);
				}
			} catch (e) {
				console.error("[Worker] 전역 Error:", e);
				await wait(this.deps.blockMs);
			}
		}
	}

	stop(): void {
		this.running = false;
	}
}
