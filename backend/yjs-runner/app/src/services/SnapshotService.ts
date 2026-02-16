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
        // todo: 서비스 로직 전체
        // update 패킷 읽기 => s3에서 스냅샷 불러오기 => 새 스냅샷 만들기
        // => s3 업로드 => update packet 스트림 비우기
        void roomId;
    }
}
