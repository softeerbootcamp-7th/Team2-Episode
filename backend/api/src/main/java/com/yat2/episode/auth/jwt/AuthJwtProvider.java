package com.yat2.episode.auth.jwt;

import com.nimbusds.jwt.JWTClaimsSet;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.jwt.JwtClaims;
import com.yat2.episode.global.jwt.JwtEngine;
import com.yat2.episode.global.jwt.TokenTypes;

@Component
public class AuthJwtProvider {

    private final JwtEngine jwt;
    private final AuthJwtProperties props;

    public AuthJwtProvider(AuthJwtProperties props) {
        this.props = props;
        this.jwt = new JwtEngine(props);
    }

    public AuthTokens issueTokens(long userId) {
        String access = issue(userId, TokenTypes.ACCESS, props.accessTokenExpiry());
        String refresh = issue(userId, TokenTypes.REFRESH, props.refreshTokenExpiry());
        return new AuthTokens(access, refresh);
    }

    private String issue(long userId, String type, long ttlMillis) {
        Instant now = Instant.now();

        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(props.issuer()).subject(String.valueOf(userId))
                .claim(JwtClaims.TOKEN_TYPE, type).issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusMillis(ttlMillis))).jwtID(UUID.randomUUID().toString()).build();

        return jwt.sign(claims);
    }

    public long verifyAccessTokenAndGetUserId(String token) {
        return verifyAndExtractUserId(token, TokenTypes.ACCESS);
    }

    public long verifyRefreshTokenAndGetUserId(String token) {
        return verifyAndExtractUserId(token, TokenTypes.REFRESH);
    }

    private long verifyAndExtractUserId(String token, String expectedType) {
        JWTClaimsSet claims = jwt.verify(token, expectedType);
        try {
            return Long.parseLong(claims.getSubject());
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }
    }
}
