package com.yat2.episode.auth.jwt;

import com.nimbusds.jwt.JWTClaimsSet;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import com.yat2.episode.global.jwt.JwtEngine;
import com.yat2.episode.global.jwt.JwtProperties;

@Component
public class AuthJwtProvider {

    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final JwtEngine jwt;
    private final AuthJwtProperties props;

    public AuthJwtProvider(AuthJwtProperties props) {
        this.props = props;
        this.jwt = new JwtEngine(props);
    }

    public IssuedTokens issueTokens(Long userId) {
        String access = issue(userId, TYPE_ACCESS, props.accessTokenExpiry());
        String refresh = issue(userId, TYPE_REFRESH, props.refreshTokenExpiry());
        return new IssuedTokens(access, refresh);
    }

    private String issue(Long userId, String type, long ttlMillis) {
        Instant now = Instant.now();

        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(props.issuer()).subject(String.valueOf(userId))
                .claim(JwtProperties.CLAIM_TOKEN_TYPE, type).issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusMillis(ttlMillis))).jwtID(UUID.randomUUID().toString()).build();

        return jwt.sign(claims);
    }

    public Long verifyAccessTokenAndGetUserId(String token) {
        JWTClaimsSet claims = jwt.verify(token, TYPE_ACCESS);
        return Long.parseLong(claims.getSubject());
    }

    public Long verifyRefreshTokenAndGetUserId(String token) {
        JWTClaimsSet claims = jwt.verify(token, TYPE_REFRESH);
        return Long.parseLong(claims.getSubject());
    }
}
