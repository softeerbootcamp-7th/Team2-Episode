import * as Y from 'yjs';
import {GenericContainer, StartedTestContainer} from "testcontainers";
import Redis from 'ioredis';
import {CreateBucketCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {SnapshotService} from "../../src/services/SnapshotService";
import {RedisUpdateRepository} from "../../src/infrastructure/UpdateRepository";
import {S3SnapshotStorage} from "../../src/infrastructure/S3SnapshotStorage";
import {DefaultYjsProcessor} from "../../src/domain/YjsProcessor";

describe('SnapshotService Integration Test (Testcontainers)', () => {
    let redisContainer: StartedTestContainer;
    let minioContainer: StartedTestContainer;

    let redis: Redis;
    let s3Client: S3Client;
    let service: SnapshotService;
    let storage: S3SnapshotStorage;

    const BUCKET_NAME = 'episode-test-bucket';
    const ROOM_ID = 'test-room-999';

    beforeAll(async () => {
        redisContainer = await new GenericContainer("redis:7-alpine")
            .withExposedPorts(6379)
            .start();

        minioContainer = await new GenericContainer("minio/minio")
            .withExposedPorts(9000)
            .withCommand(["server", "/data"])
            .start();

        const redisHost = redisContainer.getHost();
        const redisPort = redisContainer.getMappedPort(6379);
        const minioHost = minioContainer.getHost();
        const minioPort = minioContainer.getMappedPort(9000);

        redis = new Redis({host: redisHost, port: redisPort});

        const s3Config = {
            region: 'us-east-1',
            endpoint: `http://${minioHost}:${minioPort}`,
            forcePathStyle: true,
            credentials: {accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin'}
        };
        s3Client = new S3Client(s3Config);

        await s3Client.send(new CreateBucketCommand({Bucket: BUCKET_NAME}));

        storage = new S3SnapshotStorage({
            ...s3Config,
            bucket: BUCKET_NAME,
            keyPrefix: 'snapshots/',
            accessKey: 'minioadmin',
            secretKey: 'minioadmin'
        });

        const updateRepo = new RedisUpdateRepository(redis, {
            updateStreamKeyPrefix: 'updates:'
        });

        service = new SnapshotService({
            updateRepo,
            storage,
            yjs: new DefaultYjsProcessor()
        });
    }, 60000);

    afterAll(async () => {
        if (redis) await redis.quit();
        if (redisContainer) await redisContainer.stop();
        if (minioContainer) await minioContainer.stop();
    });


    it('성공 케이스: S3에 베이스가 있을 때 Redis 업데이트를 병합하여 저장하고 Redis를 비워야 한다', async () => {
        const streamKey = `updates:${ROOM_ID}`;
        const s3Key = `snapshots/${ROOM_ID}`;

        const ydoc = new Y.Doc();
        const ytext = ydoc.getText('test');
        ytext.insert(0, 'hello');
        const baseSnapshot = Y.encodeStateAsUpdate(ydoc);

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: baseSnapshot
        }));

        const updateDoc = new Y.Doc();
        const updateText = updateDoc.getText('test');
        updateText.insert(5, ' world');
        const dummyUpdate = Y.encodeStateAsUpdate(updateDoc);

        await redis.xadd(`updates:${ROOM_ID}`, '*', 'u', Buffer.from(dummyUpdate));

        await service.process(ROOM_ID);

        const remaining = await redis.xrange(streamKey, '-', '+');
        expect(remaining.length).toBe(0);
        const downloaded = await storage.download(ROOM_ID);

        expect(downloaded).not.toEqual(baseSnapshot);
        expect(downloaded.length).toBeGreaterThan(0);
    });

    it('S3에 베이스 데이터가 없으면 에러가 발생해야 한다', async () => {
        const noBaseRoomId = 'no-base-room';
        const streamKey = `updates:${noBaseRoomId}`;

        await redis.xadd(streamKey, '*', 'u', Buffer.from([1, 2]));

        await expect(service.process(noBaseRoomId)).rejects.toThrow();
    });
});
