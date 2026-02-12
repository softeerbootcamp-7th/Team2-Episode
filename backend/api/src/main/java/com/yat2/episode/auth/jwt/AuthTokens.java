package com.yat2.episode.auth.jwt;

public record AuthTokens(
        String accessToken,
        String refreshToken
) {}
