import {S3Client} from "@aws-sdk/client-s3";

export interface SnapshotStorage {
    upload(roomId: string, data: Uint8Array): Promise<void>;

    download(roomId: string): Promise<Uint8Array>;
}

export type S3Config = {
    region: string;
    bucket: string;
    keyPrefix: string;
    endpoint?: string;
    accessKey?: string;
    secretKey?: string;
    forcePathStyle?: boolean;
};

export class S3SnapshotStorage implements SnapshotStorage {
    private readonly client: S3Client;

    constructor(private readonly config: S3Config) {
        this.client = new S3Client({
            region: config.region,
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle ?? !!config.endpoint,
            credentials: (config.accessKey && config.secretKey)
                ? {
                    accessKeyId: config.accessKey,
                    secretAccessKey: config.secretKey,
                }
                : undefined,
        });
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
