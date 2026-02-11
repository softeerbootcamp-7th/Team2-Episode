package com.yat2.episode.auth.jwt;

import com.nimbusds.jwt.JWTClaimsSet;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

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

    public Long verifyAccessTokenAndGetUserId(String token) {
        JWTClaimsSet claims = jwt.verify(token, TokenTypes.ACCESS);
        return Long.parseLong(claims.getSubject());
    }

    public Long verifyRefreshTokenAndGetUserId(String token) {
        JWTClaimsSet claims = jwt.verify(token, TokenTypes.REFRESH);
        return Long.parseLong(claims.getSubject());
    }
}
