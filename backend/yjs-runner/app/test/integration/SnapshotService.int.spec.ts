import * as Y from "yjs";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import Redis from "ioredis";
import {
	CreateBucketCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { SnapshotService } from "../../src/services/SnapshotService";
import { RedisUpdateRepository } from "../../src/infrastructure/UpdateRepository";
import { S3SnapshotStorage } from "../../src/infrastructure/S3SnapshotStorage";
import { DefaultYjsProcessor } from "../../src/domain/YjsProcessor";
import * as encoding from "lib0/encoding";
import { JobType } from "../../src/contracts/Job";
import type { WebsocketSyncClient } from "../../src/infrastructure/WebsocketSyncClient";

describe("SnapshotService Integration Test (Testcontainers)", () => {
	let redisContainer: StartedTestContainer;
	let minioContainer: StartedTestContainer;

	let redis: Redis;
	let s3Client: S3Client;
	let service: SnapshotService;
	let storage: S3SnapshotStorage;

	const BUCKET_NAME = "episode-test-bucket";
	const ROOM_ID = "test-room-999";

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

		redis = new Redis({ host: redisHost, port: redisPort });

		const s3Config = {
			region: "us-east-1",
			endpoint: `http://${minioHost}:${minioPort}`,
			forcePathStyle: true,
			credentials: { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" },
		};
		s3Client = new S3Client(s3Config);

		await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));

		storage = new S3SnapshotStorage({
			...s3Config,
			bucket: BUCKET_NAME,
			keyPrefix: "snapshots/",
			accessKey: "minioadmin",
			secretKey: "minioadmin",
		});

		const syncClient = {
			sync: async (doc: Y.Doc) => doc,
		} as unknown as WebsocketSyncClient;

		const updateRepo = new RedisUpdateRepository(redis, {
			updateStreamKeyPrefix: "updates:",
		});

		service = new SnapshotService({
			updateRepo,
			storage,
			yjs: new DefaultYjsProcessor(),
			syncClient,
		});
	}, 60000);

	afterAll(async () => {
		if (redis) await redis.quit();
		if (redisContainer) await redisContainer.stop();
		if (minioContainer) await minioContainer.stop();
	});

	it("성공: S3 base + Redis updates 병합 후 S3 저장, Redis stream 비움", async () => {
		const streamKey = `updates:${ROOM_ID}`;
		const s3Key = `snapshots/${ROOM_ID}`;

		const baseDoc = new Y.Doc();
		baseDoc.getText("test").insert(0, "hello");
		const baseSnapshot = Y.encodeStateAsUpdate(baseDoc);

		await s3Client.send(
			new PutObjectCommand({
				Bucket: BUCKET_NAME,
				Key: s3Key,
				Body: baseSnapshot,
			}),
		);

		const updatedDoc = new Y.Doc();
		Y.applyUpdate(updatedDoc, baseSnapshot);
		updatedDoc.getText("test").insert(5, " world");

		const diffUpdate = Y.encodeStateAsUpdate(
			updatedDoc,
			Y.encodeStateVector(baseDoc),
		);

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

		const remaining = await redis.xlen(streamKey);
		expect(remaining).toBe(0);

		const downloaded = await storage.download(ROOM_ID);

		const outDoc = new Y.Doc();
		Y.applyUpdate(outDoc, downloaded);
		expect(outDoc.getText("test").toString()).toBe("hello world");
	});

	it("S3 base 없으면 에러", async () => {
		const noBaseRoomId = "no-base-room";
		const streamKey = `updates:${noBaseRoomId}`;

		await redis.xadd(streamKey, "*", "u", Buffer.from([1, 2]));

		await expect(
			service.process({
				entryId: "test-entry",
				roomId: noBaseRoomId,
				type: JobType.SNAPSHOT,
			}),
		).rejects.toThrow();
	});
});
