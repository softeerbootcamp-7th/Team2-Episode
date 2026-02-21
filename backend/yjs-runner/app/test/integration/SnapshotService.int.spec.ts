import * as Y from "yjs";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import Redis from "ioredis";
import * as encoding from "lib0/encoding";

import { SnapshotService } from "../../src/services/SnapshotService";
import { RedisUpdateRepository } from "../../src/infrastructure/redis/UpdateRepository";
import { LastEntryIdRepository } from "../../src/infrastructure/redis/LastEntryIdRepository";
import { DefaultYjsProcessor } from "../../src/domain/YjsProcessor";
import { JobType } from "../../src/contracts/Job";
import { REDIS_KEYS } from "../../src/infrastructure/redis/Constants";
import type { WebsocketSyncClient } from "../../src/infrastructure/WebsocketSyncClient";
import type { SnapshotStorage } from "../../src/infrastructure/S3SnapshotStorage";

describe("SnapshotService Integration Test (Redis + InMemory Storage)", () => {
    let redisContainer: StartedTestContainer;
    let redis: Redis;

    let service: SnapshotService;
    let updateRepo: RedisUpdateRepository;

    let storedSnapshotByRoom: Map<string, Uint8Array>;

    const ROOM_ID = "test-room-999";

    beforeAll(async () => {
        redisContainer = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();

        const host = redisContainer.getHost();
        const port = redisContainer.getMappedPort(6379);
        redis = new Redis({ host, port });

        const syncClient = {
            sync: async (doc: Y.Doc) => doc,
        } as unknown as WebsocketSyncClient;

        updateRepo = new RedisUpdateRepository(redis);
        const lastEntryIdRepo = new LastEntryIdRepository(redis);

        storedSnapshotByRoom = new Map();

        const storage: SnapshotStorage = {
            download: jest.fn(async (roomId: string) => {
                const v = storedSnapshotByRoom.get(roomId);
                if (!v) throw new Error("NoSuchKey: The specified key does not exist.");
                return v;
            }),
            upload: jest.fn(async (roomId: string, lastEntryId: string, snapshot: Uint8Array) => {
                storedSnapshotByRoom.set(roomId, snapshot);
            }),
        } as unknown as SnapshotStorage;

        service = new SnapshotService({
            updateRepo,
            storage,
            yjs: new DefaultYjsProcessor(),
            syncClient,
            lastEntryIdRepo,
        });
    }, 60000);

    afterAll(async () => {
        if (redis) await redis.quit();
        if (redisContainer) await redisContainer.stop();
    });

    beforeEach(async () => {
        await redis.flushall();
        storedSnapshotByRoom.clear();
    });

    it("성공: base + Redis updates 병합 후 snapshot 저장, Redis stream 정리", async () => {
        const streamKey = `${REDIS_KEYS.ROOM_STREAM_PREFIX}${ROOM_ID}`;

        const baseDoc = new Y.Doc();
        baseDoc.getText("test").insert(0, "hello");
        const baseSnapshot = Y.encodeStateAsUpdate(baseDoc);

        storedSnapshotByRoom.set(ROOM_ID, baseSnapshot);

        const updatedDoc = new Y.Doc();
        Y.applyUpdate(updatedDoc, baseSnapshot);
        updatedDoc.getText("test").insert(5, " world");

        const diffUpdate = Y.encodeStateAsUpdate(updatedDoc, Y.encodeStateVector(baseDoc));

        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, 0);
        encoding.writeVarUint(enc, 2);
        encoding.writeVarUint8Array(enc, diffUpdate);
        const framed = encoding.toUint8Array(enc);

        await redis.xadd(streamKey, "*", "u", Buffer.from(framed));

        await service.process({
            entryId: "test-entry",
            roomId: ROOM_ID,
            type: JobType.SNAPSHOT,
        });

        const remainingCtx = await updateRepo.fetchAllUpdates(ROOM_ID);
        expect(remainingCtx.updateFrameList.length).toBe(0);

        const downloaded = storedSnapshotByRoom.get(ROOM_ID);
        expect(downloaded).toBeDefined();

        const outDoc = new Y.Doc();
        Y.applyUpdate(outDoc, downloaded!);
        expect(outDoc.getText("test").toString()).toBe("hello world");
    });

    it("base 스냅샷 없으면 에러", async () => {
        const noBaseRoomId = "no-base-room";
        const streamKey = `${REDIS_KEYS.ROOM_STREAM_PREFIX}${noBaseRoomId}`;

        await redis.xadd(streamKey, "*", "u", Buffer.from([1, 2]));

        await expect(
            service.process({
                entryId: "test-entry",
                roomId: noBaseRoomId,
                type: JobType.SNAPSHOT,
            }),
        ).rejects.toThrow("NoSuchKey");
    });
});
