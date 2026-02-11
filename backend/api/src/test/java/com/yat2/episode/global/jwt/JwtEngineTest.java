package com.yat2.episode.global.jwt;

import com.nimbusds.jwt.JWTClaimsSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Date;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtEngineTest {

    private JwtEngine jwtEngine;

    @BeforeEach
    void setUp() {
        JwtConfig config = new JwtConfig() {
            @Override
            public String secret() {
                return "12345678901234567890123456789012";
            }

            @Override
            public String issuer() {
                return "episode";
            }
        };

        jwtEngine = new JwtEngine(config);
    }

    @Test
    void signAndVerify_success() {
        JWTClaimsSet claims =
                new JWTClaimsSet.Builder().issuer("episode").subject("1").claim(JwtClaims.TOKEN_TYPE, "test")
                        .expirationTime(Date.from(Instant.now().plusSeconds(60))).build();

        String token = jwtEngine.sign(claims);

        JWTClaimsSet verified = jwtEngine.verify(token, "test");

        assertEquals("1", verified.getSubject());
    }

    @Test
    void verify_invalidSignature() {
        JWTClaimsSet claims =
                new JWTClaimsSet.Builder().issuer("episode").subject("1").claim(JwtClaims.TOKEN_TYPE, "test")
                        .expirationTime(Date.from(Instant.now().plusSeconds(60))).build();

        String token = jwtEngine.sign(claims);

        String hacked = token.substring(0, token.length() - 1) + "x";

        CustomException ex = assertThrows(CustomException.class, () -> jwtEngine.verify(hacked, "test"));

        assertEquals(ErrorCode.INVALID_TOKEN_SIGNATURE, ex.getErrorCode());
    }

    @Test
    void verify_expired() {
        JWTClaimsSet claims =
                new JWTClaimsSet.Builder().issuer("episode").subject("1").claim(JwtClaims.TOKEN_TYPE, "test")
                        .expirationTime(Date.from(Instant.now().minusSeconds(10))).build();

        String token = jwtEngine.sign(claims);

        CustomException ex = assertThrows(CustomException.class, () -> jwtEngine.verify(token, "test"));

        assertEquals(ErrorCode.TOKEN_EXPIRED, ex.getErrorCode());
    }
}
