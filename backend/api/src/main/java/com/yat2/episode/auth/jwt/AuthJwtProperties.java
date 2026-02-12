package com.yat2.episode.auth.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

import com.yat2.episode.global.jwt.JwtConfig;

@ConfigurationProperties(prefix = "jwt.auth")
public record AuthJwtProperties(
        String secret,
        String issuer,
        long accessTokenExpiry,
        long refreshTokenExpiry
) implements JwtConfig {}
