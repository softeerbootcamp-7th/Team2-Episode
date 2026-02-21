package com.yat2.episode.collaboration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "collaboration.redis")
public record CollaborationRedisProperties(
        UpdateStream updateStream,
        JobStream jobStream
) {
    public record MaxLen(
            long count,
            boolean approximate
    ) {}

    public record UpdateStream(
            String keyPrefix,
            Duration ttl,
            String fieldUpdate,
            MaxLen maxLen
    ) {}

    public record JobStream(
            String key,
            String dedupeKeyPrefix,
            Fields fields,
            DedupeTtl dedupeTtl,
            MaxLen maxLen
    ) {
        public record Fields(
                String type,
                String roomId
        ) {}

        public record DedupeTtl(
                Duration sync,
                Duration snapshot
        ) {}
    }
}
