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
    roomIdField: string;     // roomId 용 필드명 저장.. 아마 "r"?
};

export class RedisStreamJobConsumer implements JobConsumer {
    constructor(
        private readonly redis: Redis,
        private readonly config: RedisJobConsumerConfig
    ) {
    }

    async init(): Promise<void> {
        try {
            await this.redis.xgroup(
                'CREATE',
                this.config.jobStreamKey,
                this.config.groupName,
                '$',
                'MKSTREAM'
            );
        } catch (err: any) {
            if (!err.message.includes('BUSYGROUP')) {
                throw err;
            }
        }
    }

    async read(blockMs: number, count: number = 1): Promise<SnapshotJob[]> {
        const pendingResults = await this.redis.xreadgroup(
            'GROUP', this.config.groupName, this.config.consumerName,
            'COUNT', count,
            'STREAMS', this.config.jobStreamKey,
            '0'
        ) as [string, [string, string[]][]][] | null;

        if (pendingResults && pendingResults.length > 0 && pendingResults[0][1].length > 0) {
            return this.parseEntries(pendingResults);
        }

        const results = await this.redis.xreadgroup(
            'GROUP',
            this.config.groupName,
            this.config.consumerName,
            'COUNT',
            count,
            'BLOCK',
            blockMs,
            'STREAMS',
            this.config.jobStreamKey,
            '>'
        ) as [string, [string, string[]][]][] | null;

        if (!results || results.length < 1) return [];

        return this.parseEntries(results);
    }

    async ack(entryId: string[]): Promise<void> {
        if (entryId == null || entryId.length === 0) return;

        await this.redis.xack(
            this.config.jobStreamKey,
            this.config.groupName,
            ...entryId
        );
    }

    private parseEntries(results: [string, [string, string[]][]][]): SnapshotJob[] {
        try {
            const [, entries] = results[0];

            return entries.map(([entryId, rawData]) => {
                const data: Record<string, string> = {};
                for (let i = 0; i < rawData.length; i += 2) {
                    data[rawData[i]] = rawData[i + 1];
                }

                return {
                    entryId: entryId,
                    roomId: data[this.config.roomIdField]
                };
            });
        } catch (error) {
            console.error('[RedisJobConsumer] 파싱 에러:', error);
            return [];
        }
    }
}

