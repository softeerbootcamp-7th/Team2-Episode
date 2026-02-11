package com.yat2.episode.global.jwt;

public interface JwtProperties {
    String secret();

    String issuer();

    String CLAIM_TOKEN_TYPE = "typ";
}
