package com.yat2.episode.mindmap.jwt;

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
public class MindmapJwtProvider {

    private final JwtEngine jwt;
    private final MindmapJwtProperties props;

    public MindmapJwtProvider(MindmapJwtProperties props) {
        this.props = props;
        this.jwt = new JwtEngine(props);
    }

    public String issue(long userId, UUID mindmapId) {
        Instant now = Instant.now();

        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(props.issuer()).subject(String.valueOf(userId))
                .claim(JwtClaims.TOKEN_TYPE, TokenTypes.WS_MINDMAP).claim(JwtClaims.MINDMAP_ID, mindmapId.toString())
                .issueTime(Date.from(now)).expirationTime(Date.from(now.plusMillis(props.tokenExpiry())))
                .jwtID(UUID.randomUUID().toString()).build();

        return jwt.sign(claims);
    }

    public MindmapTicketPayload verify(String token) {
        JWTClaimsSet claims = jwt.verify(token, TokenTypes.WS_MINDMAP);

        try {
            long userId = Long.parseLong(claims.getSubject());
            UUID mindmapId = UUID.fromString((String) claims.getClaim(JwtClaims.MINDMAP_ID));

            return new MindmapTicketPayload(userId, mindmapId);

        } catch (Exception e) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }
    }
}
