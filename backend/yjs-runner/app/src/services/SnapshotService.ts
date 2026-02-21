import type { UpdateRepository } from "../infrastructure/redis/UpdateRepository";
import type { SnapshotStorage } from "../infrastructure/S3SnapshotStorage";
import type { YjsProcessor } from "../domain/YjsProcessor";
import { Job, JobType } from "../contracts/Job";
import { WebsocketSyncClient } from "../infrastructure/WebsocketSyncClient";
import { LastEntryIdRepository } from "../infrastructure/redis/LastEntryIdRepository";

export class SnapshotService {
    constructor(
        private readonly deps: {
            updateRepo: UpdateRepository;
            yjs: YjsProcessor;
            storage: SnapshotStorage;
            syncClient: WebsocketSyncClient;
            lastEntryIdRepo: LastEntryIdRepository;
        },
    ) {}

    async process(job: Job): Promise<void> {
        const baseSnapshot = await this.deps.storage.download(job.roomId);
        const updates = await this.deps.updateRepo.fetchAllUpdates(job.roomId);

        if (job.type === JobType.SNAPSHOT) {
            if (!updates.updateFrameList.length) {
                return;
            }
            const newSnapshot = this.deps.yjs.buildUpdatedSnapshot(baseSnapshot, updates.updateFrameList);
            await this.commit(job.roomId, updates.lastEntryId, newSnapshot);
            await this.deps.updateRepo.trim(job.roomId, updates.lastEntryId);
        } else if (job.type === JobType.SYNC) {
            let doc = this.deps.yjs.getUpdatedYDocFromSnapshot(baseSnapshot, updates.updateFrameList);
            doc = await this.deps.syncClient.sync(doc, job.roomId);

            const newSnapshot = this.deps.yjs.getSnapshotFromDoc(doc);
            await this.commit(job.roomId, Date.now().toString(), newSnapshot);
            await this.deps.updateRepo.trim(job.roomId, updates.lastEntryId);
        }
    }

    private async commit(roomId: string, lastEntryId: string, snapshot: Uint8Array): Promise<void> {
        await this.deps.storage.upload(roomId, lastEntryId, snapshot);
        await this.deps.lastEntryIdRepo.set(roomId, lastEntryId);
    }
}
