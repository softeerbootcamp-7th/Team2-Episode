import type Redis from "ioredis";
import { REDIS_KEYS } from "./constants";

export class LastEntryIdRepository {
    constructor(private readonly redis: Redis) {}

    private getKey(roomId: string): string {
        return `${REDIS_KEYS.ROOM_STREAM_PREFIX}${roomId}${REDIS_KEYS.ROOM_LAST_ENTRY_SUFFIX}`;
    }

    async set(roomId: string, lastEntryId: string): Promise<void> {
        if (!lastEntryId) return;
        await this.redis.set(this.getKey(roomId), lastEntryId);
    }
}
