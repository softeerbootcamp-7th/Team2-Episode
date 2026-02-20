export const REDIS_KEYS = {
    ROOM_STREAM_PREFIX: "collab:room:",
    ROOM_LAST_ENTRY_SUFFIX: ":last-entry-id",
    JOB_STREAM: "collab:jobs",
    JOB_DEDUPE_PREFIX: "collab:jobs:dedupe:",
} as const;
