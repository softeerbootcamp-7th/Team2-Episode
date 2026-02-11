package com.yat2.episode.mindmap.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

import com.yat2.episode.global.jwt.JwtConfig;

@ConfigurationProperties(prefix = "jwt.mindmap")
public record JwtProperties(
        String secret,
        String issuer,
        long tokenExpiry
) implements JwtConfig {}
