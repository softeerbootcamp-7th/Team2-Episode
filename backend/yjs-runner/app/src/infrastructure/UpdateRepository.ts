import type Redis from 'ioredis';

export interface UpdateRepository {
    fetchAllUpdates(roomId: string): Promise<Uint8Array[]>;

    trim(roomId: string): Promise<void>;
}

export type UpdateRepositoryConfig = {
    updateStreamKeyPrefix: string; // ex) "collab:room:"
};

export class RedisUpdateRepository implements UpdateRepository {
    constructor(
        private readonly redis: Redis,
        private readonly config: UpdateRepositoryConfig
    ) {
    }

    async fetchAllUpdates(roomId: string): Promise<Uint8Array[]> {
        // todo: 특정 roomId의 update 데이터들 가져오기
        // key = `${config.updateStreamKeyPrefix}${roomId}`
        void roomId;
        return [];
    }

    async trim(roomId: string): Promise<void> {
        // todo: 압축에 성공한 id 기준으로 이전 데이터 삭제
        void roomId;
    }
}
