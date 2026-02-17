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
    maxRetries: number;
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
            const [, entries] = pendingResults[0];
            const entryIds = entries.map(([id]) => id);

            const pendingDetails = await this.redis.xpending(
                this.config.jobStreamKey,
                this.config.groupName,
                'IDLE', 0,
                entryIds[0],
                entryIds[entryIds.length - 1],
                count
            ) as any[];

            const validEntries: [string, string[]][] = [];
            const idsToAbandon: string[] = [];

            entries.forEach((entry, index) => {
                const deliveryCount = Number(pendingDetails[index][3]);
                if (deliveryCount > this.config.maxRetries) {
                    idsToAbandon.push(entry[0]);
                    console.warn(`[JobConsumer] 재시도 초과(${deliveryCount}), 포기: ${entry[0]}`);
                } else {
                    validEntries.push(entry);
                }
            });

            if (idsToAbandon.length > 0) {
                await this.ack(idsToAbandon);
            }

            if (validEntries.length > 0) {
                return this.parseEntries([[this.config.jobStreamKey, validEntries]]);
            }
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

