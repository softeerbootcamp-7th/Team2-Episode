package com.yat2.episode.auth.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

import com.yat2.episode.global.jwt.JwtProperties;

@ConfigurationProperties(prefix = "jwt")
public record AuthJwtProperties(
        String secret,
        String issuer,
        long accessTokenExpiry,
        long refreshTokenExpiry
) implements JwtProperties {}
