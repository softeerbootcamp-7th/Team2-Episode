package com.yat2.episode.auth.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        String secret,
        String issuer,
        long accessTokenExpiry,
        long refreshTokenExpiry
) implements com.yat2.episode.global.jwt.JwtProperties {}
