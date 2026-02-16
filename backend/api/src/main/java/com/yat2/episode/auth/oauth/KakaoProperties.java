package com.yat2.episode.auth.oauth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kakao")
public record KakaoProperties(
        String clientId,
        String clientSecret,
        String redirectUri
) {
    private static final String BASE_URL = "https://kauth.kakao.com";

    public String authUrl() {
        return BASE_URL + "/oauth/authorize";
    }

    public String tokenUrl() {
        return BASE_URL + "/oauth/token";
    }

    public String jwksUrl() {
        return BASE_URL + "/.well-known/jwks.json";
    }

    public String issuer() {
        return BASE_URL;
    }
}
