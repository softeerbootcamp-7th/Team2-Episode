package com.yat2.episode.auth.jwt;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.jwt.JwtEngine;

@Component
public class AuthJwtProvider {

    private static final String CLAIM_TOKEN_TYPE = "typ";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final JwtEngine jwt;
    private final AuthJwtProperties props;
    private final byte[] secretBytes;

    public AuthJwtProvider(AuthJwtProperties props) {
        this.props = props;
        this.secretBytes = props.secret().getBytes(StandardCharsets.UTF_8);

        if (secretBytes.length < 32) {
            throw new IllegalStateException("JWT secret is too short");
        }

        this.jwt = new JwtEngine(props);
    }

    public IssuedTokens issueTokens(Long userId) {
        String access = issueToken(userId, TYPE_ACCESS, props.accessTokenExpiry());
        String refresh = issueToken(userId, TYPE_REFRESH, props.refreshTokenExpiry());
        return new IssuedTokens(access, refresh);
    }

    private String issueToken(Long userId, String type, long ttlMillis) {
        Instant now = Instant.now();

        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(props.issuer()).subject(String.valueOf(userId))
                .issueTime(Date.from(now)).expirationTime(Date.from(now.plusMillis(ttlMillis)))
                .jwtID(UUID.randomUUID().toString()).claim(CLAIM_TOKEN_TYPE, type).build();

        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secretBytes));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    public Long verifyAccessTokenAndGetUserId(String token) {
        JWTClaimsSet claims = verify(token, TYPE_ACCESS);
        return Long.parseLong(claims.getSubject());
    }

    public Long verifyRefreshTokenAndGetUserId(String token) {
        JWTClaimsSet claims = verify(token, TYPE_REFRESH);
        return Long.parseLong(claims.getSubject());
    }

    private JWTClaimsSet verify(String token, String expectedType) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);

            if (!jwt.verify(new MACVerifier(secretBytes))) {
                throw new CustomException(ErrorCode.INVALID_TOKEN_SIGNATURE);
            }

            JWTClaimsSet claims = jwt.getJWTClaimsSet();

            if (!props.issuer().equals(claims.getIssuer())) {
                throw new CustomException(ErrorCode.INVALID_TOKEN_ISSUER);
            }
            return claims;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }
    }
}
