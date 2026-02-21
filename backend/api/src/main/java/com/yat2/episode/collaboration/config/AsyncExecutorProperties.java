package com.yat2.episode.collaboration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "collaboration.async.executor")
public record AsyncExecutorProperties(
        int corePoolSize,
        int maxPoolSize,
        int queueCapacity,
        int keepAliveSeconds,
        boolean allowCoreThreadTimeout,
        long dropLogIntervalMs,
        int updateAppendMaxRetries
) {}
