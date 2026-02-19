import type Redis from "ioredis";
import { Job, JobType } from "../contracts/Job";
import {
	RedisStreamEntry,
	RedisStreamReadResult,
} from "../contracts/RedisStreamReadResult";
import { StreamPendingEntries } from "../contracts/StreamPendingEntries";

export interface JobConsumer {
	init(): Promise<void>;

	read(blockMs: number, count?: number): Promise<Job[]>;

	ack(entryId: string[]): Promise<void>;

	del(messageIds: string[]): Promise<number>;
}

export type RedisJobConsumerConfig = {
	jobStreamKey: string;
	jobDedupePrefix: string;
	groupName: string;
	consumerName: string;
	roomIdField: string;
	typeField: string;
	maxRetries: number;
};

export class RedisStreamJobConsumer implements JobConsumer {
	constructor(
		private readonly redis: Redis,
		private readonly config: RedisJobConsumerConfig,
	) {}

	async init(): Promise<void> {
		try {
			await this.redis.xgroup(
				"CREATE",
				this.config.jobStreamKey,
				this.config.groupName,
				"$",
				"MKSTREAM",
			);
		} catch (err: any) {
			if (!err.message.includes("BUSYGROUP")) {
				throw err;
			}
		}
	}

	async read(blockMs: number, count: number = 1): Promise<Job[]> {
		const pendingResults = (await this.redis.xreadgroup(
			"GROUP",
			this.config.groupName,
			this.config.consumerName,
			"COUNT",
			count,
			"STREAMS",
			this.config.jobStreamKey,
			"0",
		)) as RedisStreamReadResult | null;

		if (
			pendingResults &&
			pendingResults.length > 0 &&
			pendingResults[0][1].length > 0
		) {
			const pendingJobs = await this.processPending(count, pendingResults);
			if (pendingJobs !== null) return pendingJobs;
		}

		const results = (await this.redis.xreadgroup(
			"GROUP",
			this.config.groupName,
			this.config.consumerName,
			"COUNT",
			count,
			"BLOCK",
			blockMs,
			"STREAMS",
			this.config.jobStreamKey,
			">",
		)) as RedisStreamReadResult | null;

		if (!results || results.length < 1) return [];

		const { jobs, badEntryIds } = this.parseEntries(results);
		if (badEntryIds.length > 0) {
			await this.ack(badEntryIds);
		}
		return jobs;
	}

	async ack(entryId: string[]): Promise<void> {
		if (entryId == null || entryId.length === 0) return;

		await this.redis.xack(
			this.config.jobStreamKey,
			this.config.groupName,
			...entryId,
		);
	}

	async del(messageIds: string[]): Promise<number> {
		if (messageIds.length === 0) return 0;
		return await this.redis.xdel(this.config.jobStreamKey, ...messageIds);
	}

	private async processPending(
		count: number = 1,
		pendingResults: RedisStreamReadResult,
	) {
		const [, entries] = pendingResults[0];
		const entryIds = entries.map(([id]) => id);

		const pendingDetails = (await this.redis.xpending(
			this.config.jobStreamKey,
			this.config.groupName,
			"IDLE",
			0,
			entryIds[0],
			entryIds[entryIds.length - 1],
			count,
		)) as StreamPendingEntries;

		const validEntries: RedisStreamEntry[] = [];
		const idsToAbandon: string[] = [];

		const deliveryById = new Map<string, number>();
		for (const p of pendingDetails) {
			deliveryById.set(p[0], Number(p[3]));
		}

		entries.forEach((entry) => {
			const id = entry[0];
			const deliveryCount = deliveryById.get(id);
			if (deliveryCount == null) return;
			if (deliveryCount > this.config.maxRetries) {
				idsToAbandon.push(entry[0]);
				console.warn(
					`[JobConsumer] 재시도 초과(${deliveryCount}), 포기: ${entry[0]}`,
				);
			} else {
				validEntries.push(entry);
			}
		});

		if (idsToAbandon.length > 0) {
			await this.ack(idsToAbandon);
		}

		if (validEntries.length > 0) {
			const { jobs, badEntryIds } = this.parseEntries([
				[this.config.jobStreamKey, validEntries],
			]);
			if (badEntryIds.length > 0) {
				await this.ack(badEntryIds);
			}
			return jobs.length > 0 ? jobs : null;
		}
		return null;
	}

	private parseEntries(results: RedisStreamReadResult): {
		jobs: Job[];
		badEntryIds: string[];
	} {
		const [, entries] = results[0];

		const badEntryIds: string[] = [];
		const jobs: Job[] = [];

		for (const [entryId, rawData] of entries) {
			try {
				const data: Record<string, string> = {};
				for (let i = 0; i < rawData.length; i += 2) {
					data[rawData[i]] = rawData[i + 1];
				}
				const rawType = data[this.config.typeField] as JobType;
				if (rawType !== JobType.SNAPSHOT && rawType !== JobType.SYNC) {
					throw new Error(`Unknown job type: ${rawType}`);
				}
				const roomId = data[this.config.roomIdField];
				if (!roomId) {
					throw new Error(`Missing roomId field`);
				}

				jobs.push({
					entryId: entryId,
					roomId: roomId,
					type: rawType,
				});
			} catch (error) {
				console.error(`[RedisJobConsumer] 파싱 실패 entryId=${entryId}`, error);
				badEntryIds.push(entryId);
			}
		}

		return { jobs, badEntryIds };
	}
}
