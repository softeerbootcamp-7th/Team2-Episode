package com.yat2.episode.collaboration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "collaboration.ws")
public record WebSocketProperties(
        int sendTimeout,
        int bufferSize,
        String pathPrefix,
        List<String> allowedOriginPatterns
) {}
