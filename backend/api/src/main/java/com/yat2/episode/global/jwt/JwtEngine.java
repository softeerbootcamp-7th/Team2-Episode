package com.yat2.episode.global.jwt;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;

public class JwtEngine {

    private final byte[] secretBytes;
    private final String issuer;

    public JwtEngine(JwtConfig props) {
        this.secretBytes = props.secret().getBytes(StandardCharsets.UTF_8);
        this.issuer = props.issuer();

        if (secretBytes.length < 32) {
            throw new IllegalStateException("JWT secret is too short");
        }
    }

    public String sign(JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secretBytes));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    public JWTClaimsSet verify(String token, String expectedType) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);

            if (!jwt.verify(new MACVerifier(secretBytes))) {
                throw new CustomException(ErrorCode.INVALID_TOKEN_SIGNATURE);
            }

            JWTClaimsSet claims = jwt.getJWTClaimsSet();

            if (!issuer.equals(claims.getIssuer())) {
                throw new CustomException(ErrorCode.INVALID_TOKEN_ISSUER);
            }

            if (claims.getExpirationTime() == null || new Date().after(claims.getExpirationTime())) {
                throw new CustomException(ErrorCode.TOKEN_EXPIRED);
            }

            String type = (String) claims.getClaim(JwtClaims.TOKEN_TYPE);
            if (!expectedType.equals(type)) {
                throw new CustomException(ErrorCode.INVALID_TOKEN_TYPE);
            }

            return claims;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }
    }
}
