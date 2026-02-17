import type {UpdateRepository} from '../infrastructure/UpdateRepository';
import type {SnapshotStorage} from '../infrastructure/S3SnapshotStorage';
import type {YjsProcessor} from '../domain/YjsProcessor';

export class SnapshotService {
    constructor(
        private readonly deps: {
            updateRepo: UpdateRepository;
            yjs: YjsProcessor;
            storage: SnapshotStorage;
        }
    ) {
    }

    async process(roomId: string): Promise<void> {
        const baseDoc = await this.deps.storage.download(roomId)
        const updates = await this.deps.updateRepo.fetchAllUpdates(roomId);
        const newDoc = this.deps.yjs.buildSnapshot(baseDoc, updates.updateFrameList);
        await this.deps.storage.upload(roomId, newDoc);
        await this.deps.updateRepo.trim(roomId, updates.lastEntryId);
    }
}
