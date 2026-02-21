package com.yat2.episode.collaboration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "collaboration.redis")
public record RedisProperties(
        UpdateStream updateStream,
        JobStream jobStream,
        LastEntryIdStore lastEntryIdStore
) {
    public record UpdateStream(
            String keyPrefix,
            Duration ttl,
            String fieldUpdate
    ) {}

    public record JobStream(
            String key,
            String dedupeKeyPrefix,
            Fields fields,
            DedupeTtl dedupeTtl
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

    public record LastEntryIdStore(
            String keySuffix
    ) {}
}
