import type {UpdateRepository} from '../infrastructure/UpdateRepository';
import type {SnapshotStorage} from '../infrastructure/S3SnapshotStorage';
import type {YjsProcessor} from '../domain/YjsProcessor';
import {Job, JobType} from "../contracts/Job";

export class SnapshotService {
    constructor(
        private readonly deps: {
            updateRepo: UpdateRepository;
            yjs: YjsProcessor;
            storage: SnapshotStorage;
        }
    ) {
    }

    async process(job: Job): Promise<void> {
        if (job.type === JobType.SNAPSHOT) {
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
