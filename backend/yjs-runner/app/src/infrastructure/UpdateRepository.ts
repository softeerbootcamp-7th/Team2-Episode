import type Redis from 'ioredis';
import * as decoding from 'lib0/decoding';
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
    private static readonly FIELD_U = 0x75; // 'u'

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

        // FIELD_U가 숫자(바이트)면 아래 BYTE 비교를 쓰고,
        // string("u")면 toString 비교를 쓰는 게 안전함.
        const FIELD_U_STR = typeof (RedisUpdateRepository as any).FIELD_U === "string"
            ? (RedisUpdateRepository as any).FIELD_U
            : "u";

        for (const [id, rawData] of entries) {
            lastEntryId = id.toString();
            if ((rawData.length & 1) === 1) continue; // field/value 쌍 깨짐 방어

            for (let i = 0; i + 1 < rawData.length; i += 2) {
                const fieldBuf = rawData[i];
                const valueBuf = rawData[i + 1];

                if (!fieldBuf || !valueBuf) continue;

                // ✅ 가장 안전: string 비교
                if (fieldBuf.toString("utf8") !== FIELD_U_STR) continue;

                // u 필드의 값만 추가 (Buffer는 Uint8Array라 그대로 가능)
                updateFrameList.push(valueBuf);

                // 한 엔트리에 u가 1개만 있다고 확신하면 break 걸어도 됨
                // break;
            }
        }

        return {lastEntryId, roomId, updateFrameList};
    }

    async trim(roomId: string, lastEntryId: string): Promise<void> {
        if (lastEntryId === this.defaultLastEntryId) return;
        const key = this.getStreamKey(roomId);
        await this.redis.xtrim(key, 'MINID', lastEntryId);
        await this.redis.xdel(key, lastEntryId);
    }

    private getPureUpdateFromRawData(rawData: Buffer[], i: number) {
        const field = rawData[i];
        if (field.length === 1 && field[0] === RedisUpdateRepository.FIELD_U) {
            return rawData[i];

            const rawBuffer = rawData[i + 1];
            return this.decodePureUpdate(rawBuffer);
        }
        return null;
    }

    private decodePureUpdate(rawBuffer: Uint8Array): Uint8Array | null {
        try {
            const dec = decoding.createDecoder(rawBuffer);
            decoding.readVarUint(dec);
            decoding.readVarUint(dec);
            return decoding.readVarUint8Array(dec);
        } catch {
            return null;
        }
    }

}
