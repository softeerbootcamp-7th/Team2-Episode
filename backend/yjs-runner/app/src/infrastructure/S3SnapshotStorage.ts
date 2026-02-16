import {GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";

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

    private getFullKey(roomId: string): string {
        return `${this.config.keyPrefix}${roomId}`;
    }

    async upload(roomId: string, data: Uint8Array): Promise<void> {
        const command = new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: this.getFullKey(roomId),
            Body: data,
            ContentType: 'application/octet-stream',
        });

        await this.client.send(command);
    }

    async download(roomId: string): Promise<Uint8Array> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: this.getFullKey(roomId),
            });

            const response = await this.client.send(command);
            if (!response.Body) {
                return new Uint8Array();
            }

            return await response.Body.transformToByteArray();

        } catch (error) {
            if (error instanceof NoSuchKey) {
                console.info(`[S3Storage] 해당 roomId에 대한 데이터가 존재하지 않습니다.: ${roomId}.`);
            } else {
                console.error("[S3Storage] 예상치 못한 에러가 발생했습니다.", error);
            }
            throw error;
        }
    }
}
