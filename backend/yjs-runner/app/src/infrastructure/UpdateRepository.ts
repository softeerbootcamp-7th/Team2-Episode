import type Redis from 'ioredis';
import {SnapshotBuildContext} from "../contracts/SnapshotBuildContext";

export interface UpdateRepository {
    fetchAllUpdates(roomId: string): Promise<SnapshotBuildContext>;

    trim(roomId: string, lastEntryId: string): Promise<void>;
}

export type UpdateRepositoryConfig = {
    updateStreamKeyPrefix: string; // ex) "collab:room:"
};

export class RedisUpdateRepository implements UpdateRepository {
    private readonly defaultLastEntryId = "0-0"
    private readonly fieldUpdate = "u"

    constructor(
        private readonly redis: Redis,
        private readonly config: UpdateRepositoryConfig
    ) {
    }

    private getStreamKey(roomId: string): string {
        return `${this.config.updateStreamKeyPrefix}${roomId}`;
    }

    async fetchAllUpdates(roomId: string): Promise<SnapshotBuildContext> {
        const key = this.getStreamKey(roomId);
        const entries = await this.redis.xrangeBuffer(key, '-', '+') as unknown as [Buffer, Buffer[]][];

        if (!entries || entries.length === 0) {
            return {
                lastEntryId: this.defaultLastEntryId,
                roomId,
                updateFrameList: []
            };
        }

        const updateFrameList: Uint8Array[] = [];
        let lastEntryId = this.defaultLastEntryId;

        for (const [id, rawData] of entries) {
            lastEntryId = id.toString();
            const dataIndex = rawData.findIndex(buf => buf.toString() === this.fieldUpdate);
            if (dataIndex !== -1) {
                const rawBuffer = rawData[dataIndex + 1];
                updateFrameList.push(new Uint8Array(rawBuffer));
            }
        }

        return {
            lastEntryId,
            roomId,
            updateFrameList
        };
    }

    async trim(roomId: string, lastEntryId: string): Promise<void> {
        if (lastEntryId === this.defaultLastEntryId) return;
        const key = this.getStreamKey(roomId);
        await this.redis.xtrim(key, 'MINID', lastEntryId);
        await this.redis.xdel(key, lastEntryId);
    }
}
