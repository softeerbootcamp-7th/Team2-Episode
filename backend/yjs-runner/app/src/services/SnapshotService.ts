import type { UpdateRepository } from "../infrastructure/UpdateRepository";
import type { SnapshotStorage } from "../infrastructure/S3SnapshotStorage";
import type { YjsProcessor } from "../domain/YjsProcessor";
import { Job, JobType } from "../contracts/Job";
import { WebsocketSyncClient } from "../infrastructure/WebsocketSyncClient";

export class SnapshotService {
    constructor(
        private readonly deps: {
            updateRepo: UpdateRepository;
            yjs: YjsProcessor;
            storage: SnapshotStorage;
            syncClient: WebsocketSyncClient;
        },
    ) {}

    async process(job: Job): Promise<void> {
        const baseSnapshot = await this.deps.storage.download(job.roomId);
        const updates = await this.deps.updateRepo.fetchAllUpdates(job.roomId);

        if (job.type === JobType.SNAPSHOT) {
            const newSnapshot = this.deps.yjs.buildUpdatedSnapshot(baseSnapshot, updates.updateFrameList);
            await this.deps.storage.upload(job.roomId, newSnapshot);
            await this.deps.updateRepo.trim(job.roomId, updates.lastEntryId);
        } else if (job.type === JobType.SYNC) {
            let doc = this.deps.yjs.getUpdatedYDocFromSnapshot(baseSnapshot, updates.updateFrameList);

            doc = await this.deps.syncClient.sync(doc, job.roomId);

            const newSnapshot = this.deps.yjs.getSnapshotFromDoc(doc);
            await this.deps.storage.upload(job.roomId, newSnapshot);
            await this.deps.updateRepo.trim(job.roomId, updates.lastEntryId);
        }
    }
}
