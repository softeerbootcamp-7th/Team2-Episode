import type Redis from 'ioredis';
import type {SnapshotJob} from '../contracts/SnapshotJob';

export interface JobConsumer {
    init(): Promise<void>;

    read(blockMs: number, count?: number): Promise<SnapshotJob[]>;

    ack(entryId: string[]): Promise<void>;
}

export type RedisJobConsumerConfig = {
    jobStreamKey: string;     // e.g. "yjs:save:jobs"
    groupName: string;        // e.g. "snapshot-workers"
    consumerName: string;     // e.g. `worker-${process.pid}`
    roomIdField?: string;     // roomId 용 필드명 저장.. 아마 "r"?
};

export class RedisStreamJobConsumer implements JobConsumer {
    constructor(
        private readonly redis: Redis,
        private readonly config: RedisJobConsumerConfig
    ) {
    }

    async init(): Promise<void> {
        // todo:
        // XGROUP CREATE <jobStreamKey> <groupName> $ MKSTREAM
    }

    async read(blockMs: number, count: number = 1): Promise<SnapshotJob[]> {
        // todo:
        // XREADGROUP GROUP <group> <consumer> COUNT <count> BLOCK <blockMs> STREAMS <stream> >
        // 파싱 entries -> SnapshotJob[]
        void blockMs;
        void count;
        return [];
    }

    async ack(entryId: string[]): Promise<void> {
        // todo:
        // XACK <stream> <group> <id...>
        void entryId;
    }
}

