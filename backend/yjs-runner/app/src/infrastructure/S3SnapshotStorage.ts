export interface SnapshotStorage {
    upload(roomId: string, data: Uint8Array): Promise<void>;

    download(roomId: string): Promise<Uint8Array>;
}

export type S3Config = {
    region: string;
    bucket: string;
    keyPrefix: string;
};

export class S3SnapshotStorage implements SnapshotStorage {
    constructor(private readonly config: S3Config) {
    }

    async upload(roomId: string, data: Uint8Array): Promise<void> {
        // todo: PutObject 진행
        // Key 예시: `${config.keyPrefix}/${roomId}`
        void roomId;
        void data;
    }

    async download(roomId: string): Promise<Uint8Array> {
        // todo: GetObject 진행
        // Key 예시: `${config.keyPrefix}/${roomId}`
        void roomId;
        return new Uint8Array();
    }
}
