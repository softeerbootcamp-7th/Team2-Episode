import type {UpdateRepository} from '../infrastructure/UpdateRepository';
import type {SnapshotStorage} from '../infrastructure/S3SnapshotStorage';
import type {YjsProcessor} from '../domain/YjsProcessor';
import {SnapshotJob, SnapshotJobType} from "../contracts/SnapshotJob";

export class SnapshotService {
    constructor(
        private readonly deps: {
            updateRepo: UpdateRepository;
            yjs: YjsProcessor;
            storage: SnapshotStorage;
        }
    ) {
    }

    async process(job: SnapshotJob): Promise<void> {
        if (job.type === SnapshotJobType.SNAPSHOT) {
            const baseDoc = await this.deps.storage.download(job.roomId)
            const updates = await this.deps.updateRepo.fetchAllUpdates(job.roomId);
            const newDoc = this.deps.yjs.buildSnapshot(baseDoc, updates.updateFrameList);
            await this.deps.storage.upload(job.roomId, newDoc);
            await this.deps.updateRepo.trim(job.roomId, updates.lastEntryId);
        } else {
            // todo: sync 처리 필요
        }
    }
}
