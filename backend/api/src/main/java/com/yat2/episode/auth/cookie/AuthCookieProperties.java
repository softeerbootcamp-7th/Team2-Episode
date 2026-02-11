package com.yat2.episode.auth.cookie;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cookie")
public record AuthCookieProperties(
        String domain,
        boolean secure,
        String sameSite
) {}
