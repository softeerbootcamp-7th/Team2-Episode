export type StreamPendingEntry = [entryId: string, consumer: string, idleMs: number, deliveryCount: number];

export type StreamPendingEntries = StreamPendingEntry[];
