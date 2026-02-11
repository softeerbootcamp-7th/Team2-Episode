package com.yat2.episode.auth.jwt;

import com.nimbusds.jwt.JWTClaimsSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.jwt.JwtClaims;
import com.yat2.episode.global.jwt.JwtEngine;
import com.yat2.episode.global.jwt.TokenTypes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthJwtProviderTest {

    private AuthJwtProvider provider;
    private AuthJwtProperties props;

    @BeforeEach
    void setUp() {
        props = new AuthJwtProperties("12345678901234567890123456789012", "episode", 30000, 60000);

        provider = new AuthJwtProvider(props);
    }

    @Test
    void issueAndVerify_access_success() {
        long userId = 42L;

        AuthTokens tokens = provider.issueTokens(userId);

        long verifiedUserId = provider.verifyAccessTokenAndGetUserId(tokens.accessToken());

        assertEquals(userId, verifiedUserId);
    }

    @Test
    void issueAndVerify_refresh_success() {
        long userId = 42L;

        AuthTokens tokens = provider.issueTokens(userId);

        long verifiedUserId = provider.verifyRefreshTokenAndGetUserId(tokens.refreshToken());

        assertEquals(userId, verifiedUserId);
    }

    @Test
    void verify_wrongType_shouldThrow() {
        long userId = 42L;

        JwtEngine engine = new JwtEngine(props);

        Instant now = Instant.now();

        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(props.issuer()).subject(String.valueOf(userId))
                .claim(JwtClaims.TOKEN_TYPE, TokenTypes.WS_MINDMAP).issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusMillis(props.accessTokenExpiry())))
                .jwtID(UUID.randomUUID().toString()).build();

        String wrongToken = engine.sign(claims);

        CustomException ex =
                assertThrows(CustomException.class, () -> provider.verifyAccessTokenAndGetUserId(wrongToken));

        assertNotNull(ex.getErrorCode());
    }

    @Test
    void verify_invalidSubject_shouldThrow() {
        JwtEngine engine = new JwtEngine(props);

        Instant now = Instant.now();

        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(props.issuer()).subject("not-a-number")
                .claim(JwtClaims.TOKEN_TYPE, TokenTypes.ACCESS).issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusMillis(props.accessTokenExpiry())))
                .jwtID(UUID.randomUUID().toString()).build();

        String hacked = engine.sign(claims);

        assertThrows(CustomException.class, () -> provider.verifyAccessTokenAndGetUserId(hacked));
    }
}
