package com.yat2.episode.collaboration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "collaboration.ws")
public record WebSocketProperties(
        int sendTimeout,
        int bufferSize
) {}
