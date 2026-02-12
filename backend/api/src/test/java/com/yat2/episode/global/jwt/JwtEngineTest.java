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

    private JWTClaimsSet createClaims(int seconds) {
        return new JWTClaimsSet.Builder().issuer("episode").subject("1").claim(JwtClaims.TOKEN_TYPE, "test")
                .expirationTime(Date.from(Instant.now().plusSeconds(seconds))).build();
    }

    @Test
    void signAndVerify_success() {
        JWTClaimsSet claims = createClaims(300);

        String token = jwtEngine.sign(claims);

        JWTClaimsSet verified = jwtEngine.verify(token, "test");

        assertEquals("1", verified.getSubject());
    }

    @Test
    void verify_invalidSignature() {

        JwtConfig wrongConfig = new JwtConfig() {
            @Override
            public String secret() {
                return "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
            }

            @Override
            public String issuer() {
                return "episode";
            }
        };

        JwtEngine wrongEngine = new JwtEngine(wrongConfig);

        JWTClaimsSet claims = createClaims(300);

        String token = wrongEngine.sign(claims);

        String hacked = token.substring(0, token.length() - 1) + "x";

        CustomException ex = assertThrows(CustomException.class, () -> jwtEngine.verify(hacked, "test"));

        assertEquals(ErrorCode.INVALID_TOKEN_SIGNATURE, ex.getErrorCode());
    }

    @Test
    void verify_expired() {
        JWTClaimsSet claims = createClaims(0);

        String token = jwtEngine.sign(claims);

        CustomException ex = assertThrows(CustomException.class, () -> jwtEngine.verify(token, "test"));

        assertEquals(ErrorCode.TOKEN_EXPIRED, ex.getErrorCode());
    }
}
