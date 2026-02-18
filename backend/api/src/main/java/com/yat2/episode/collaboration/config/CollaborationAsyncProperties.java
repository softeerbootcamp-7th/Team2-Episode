package com.yat2.episode.collaboration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "collaboration.async.executor")
public record CollaborationAsyncProperties(
        int corePoolSize,
        int maxPoolSize,
        int queueCapacity,
        int keepAliveSeconds,
        boolean allowCoreThreadTimeout,
        long dropLogIntervalMs
) {}
