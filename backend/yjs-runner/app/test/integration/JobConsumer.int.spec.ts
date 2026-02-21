import Redis from "ioredis";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { RedisStreamJobConsumer } from "../../src/infrastructure/redis/JobConsumer";
import { REDIS_KEYS } from "../../src/infrastructure/redis/Constants";

describe("RedisStreamJobConsumer Integration Test", () => {
    let redisContainer: StartedTestContainer;
    let redis: Redis;
    let consumer: RedisStreamJobConsumer;

    const STREAM_KEY = REDIS_KEYS.JOB_STREAM;
    const GROUP_NAME = "test-group";
    const CONSUMER_NAME = "test-worker";

    beforeAll(async () => {
        redisContainer = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();

        const host = redisContainer.getHost();
        const port = redisContainer.getMappedPort(6379);
        redis = new Redis({ host, port });

        consumer = new RedisStreamJobConsumer(redis, {
            groupName: GROUP_NAME,
            consumerName: CONSUMER_NAME,
            roomIdField: "rid",
            typeField: "type",
            maxRetries: 5,
        });

        await consumer.init();
    }, 30000);

    afterAll(async () => {
        await redis.quit();
        await redisContainer.stop();
    });

    beforeEach(async () => {
        await redis.flushall();
        await consumer.init();
    });

    it("메시지를 발행하면 Read를 통해 Job 형태로 읽어와야 한다", async () => {
        const testRoomId = "room-123";

        await redis.xadd(STREAM_KEY, "*", "rid", testRoomId, "type", "SNAPSHOT");

        const jobs = await consumer.read(1000, 1);

        expect(jobs.length).toBe(1);
        expect(jobs[0].roomId).toBe(testRoomId);
        expect(jobs[0].entryId).toBeDefined();
    });

    it("ACK를 보내면 해당 메시지는 PEL에서 제거되어야 한다", async () => {
        const testRoomId = "room-456";

        await redis.xadd(STREAM_KEY, "*", "rid", testRoomId, "type", "SNAPSHOT");

        const jobs = await consumer.read(1000, 1);
        const messageId = jobs[0].entryId;

        const pendingBefore = await redis.xpending(STREAM_KEY, GROUP_NAME);

        expect(Number(pendingBefore[0])).toBeGreaterThanOrEqual(1);

        await consumer.ack([messageId]);

        const pendingAfter = await redis.xpending(STREAM_KEY, GROUP_NAME);

        expect(Number(pendingAfter[0])).toBe(0);
    });

    it("데이터가 없으면 빈 배열 반환", async () => {
        const jobs = await consumer.read(100, 1);
        expect(jobs).toEqual([]);
    });

    it("maxRetries 초과 시 자동 ACK되고 읽히지 않아야 한다", async () => {
        const testRoomId = "poison-pill-room";

        await redis.xadd(STREAM_KEY, "*", "rid", testRoomId, "type", "SNAPSHOT");

        for (let i = 0; i < 6; i++) {
            await consumer.read(100, 1);
        }

        const jobs = await consumer.read(100, 1);

        expect(jobs.length).toBe(0);

        const pending = await redis.xpending(STREAM_KEY, GROUP_NAME);

        expect(Number(pending[0])).toBe(0);
    });

    it("maxRetries 이내라면 다시 읽어와야 한다", async () => {
        const testRoomId = "retry-room";

        await redis.xadd(STREAM_KEY, "*", "rid", testRoomId, "type", "SNAPSHOT");

        await consumer.read(100, 1);

        const jobs = await consumer.read(100, 1);

        expect(jobs.length).toBe(1);
        expect(jobs[0].roomId).toBe(testRoomId);

        const pending = await redis.xpending(STREAM_KEY, GROUP_NAME);

        expect(Number(pending[0])).toBe(1);
    });
});
