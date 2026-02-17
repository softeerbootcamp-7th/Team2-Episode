import 'dotenv/config';
import Redis from 'ioredis';
import {S3SnapshotStorage} from './infrastructure/S3SnapshotStorage';
import {RedisUpdateRepository} from './infrastructure/UpdateRepository';
import {DefaultYjsProcessor} from './domain/YjsProcessor';
import {SnapshotService} from './services/SnapshotService';
import {RedisStreamJobConsumer} from './infrastructure/JobConsumer';
import {SnapshotWorker} from './worker/SnapshotWorker';

const redis = new Redis({
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT ?? 6379),
});

const updateRepo = new RedisUpdateRepository(redis, {
    updateStreamKeyPrefix: process.env.UPDATE_STREAM_PREFIX!,
});

const storage = new S3SnapshotStorage({
    region: process.env.AWS_REGION!,
    bucket: process.env.S3_BUCKET!,
    keyPrefix: process.env.S3_PREFIX!,
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const yjs = new DefaultYjsProcessor();

const service = new SnapshotService({updateRepo, yjs, storage});

const consumer = new RedisStreamJobConsumer(redis, {
    jobStreamKey: process.env.JOB_STREAM_KEY!,
    groupName: process.env.JOB_GROUP_NAME!,
    consumerName: process.env.JOB_CONSUMER_NAME!,
    roomIdField: process.env.JOB_ROOM_FIELD ? process.env.JOB_ROOM_FIELD : "r",
});

const worker = new SnapshotWorker({
    consumer,
    service,
    blockMs: Number(process.env.JOB_BLOCK_MS ?? 10000),
    count: Number(process.env.JOB_COUNT ?? 1),
});

async function main() {
    await worker.init();
    await worker.start();
}

main();

process.on('SIGINT', async () => {
    worker.stop();
    await redis.quit();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    worker.stop();
    await redis.quit();
    process.exit(0);
});
