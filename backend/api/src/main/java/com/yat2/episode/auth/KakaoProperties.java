package com.yat2.episode.auth;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "kakao")
public class KakaoProperties {

    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private String authUrl;
    private String tokenUrl;
}