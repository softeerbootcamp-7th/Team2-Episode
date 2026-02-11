package com.yat2.episode.mindmap.jwt;

import com.nimbusds.jwt.JWTClaimsSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.jwt.JwtClaims;
import com.yat2.episode.global.jwt.JwtEngine;
import com.yat2.episode.global.jwt.TokenTypes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MindmapJwtProviderTest {

    private MindmapJwtProvider provider;
    private MindmapJwtProperties props;

    @BeforeEach
    void setUp() {
        props = new MindmapJwtProperties("12345678901234567890123456789012", "episode", 30000);

        provider = new MindmapJwtProvider(props);
    }

    @Test
    void issueAndVerify_success() {
        long userId = 42L;
        UUID mindmapId = UUID.randomUUID();

        String token = provider.issue(userId, mindmapId);

        MindmapTicketPayload payload = provider.verify(token);

        assertEquals(userId, payload.userId());
        assertEquals(mindmapId, payload.mindmapId());
    }

    @Test
    void verify_invalidMindmapId_throwInvalidToken() {
        long userId = 42L;

        JwtEngine engine = new JwtEngine(props);

        Instant now = Instant.now();

        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(props.issuer()).subject(String.valueOf(userId))
                .claim(JwtClaims.TOKEN_TYPE, TokenTypes.WS_MINDMAP).claim(JwtClaims.MINDMAP_ID, "invalid-uuid")
                .issueTime(Date.from(now)).expirationTime(Date.from(now.plusMillis(props.tokenExpiry())))
                .jwtID(UUID.randomUUID().toString()).build();

        String hacked = engine.sign(claims);

        CustomException ex = assertThrows(CustomException.class, () -> provider.verify(hacked));
        assertEquals(ErrorCode.INVALID_TOKEN, ex.getErrorCode());
    }
}
