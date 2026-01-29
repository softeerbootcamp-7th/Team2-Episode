package com.yat2.episode.auth.cookie;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

@Component
public class AuthCookieResolver {
    public Optional<String> findAccessToken(HttpServletRequest request) {
        return findCookieValue(request, AuthCookieNames.ACCESS_COOKIE_NAME);
    }

    public Optional<String> findRefreshToken(HttpServletRequest request) {
        return findCookieValue(request, AuthCookieNames.REFRESH_COOKIE_NAME);
    }


    private Optional<String> findCookieValue(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) return Optional.empty();

        return Arrays.stream(cookies)
                .filter(c -> cookieName.equals(c.getName()))
                .map(Cookie::getValue)
                .map(v -> v == null ? "" : v.trim())
                .filter(v -> !v.isBlank())
                .findFirst();
    }
}