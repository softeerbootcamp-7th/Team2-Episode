package com.yat2.episode.auth.cookie;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

import com.yat2.episode.auth.jwt.AuthJwtProperties;

import static com.yat2.episode.auth.cookie.CookieNames.ACCESS_COOKIE_NAME;
import static com.yat2.episode.auth.cookie.CookieNames.REFRESH_COOKIE_NAME;

@Component
@RequiredArgsConstructor
public class CookieFactory {

    private final CookieProperties cookieProps;
    private final AuthJwtProperties authJwtProps;

    public ResponseCookie access(String token) {
        return build(Spec.ACCESS, token, Duration.ofMillis(authJwtProps.accessTokenExpiry()));
    }

    public ResponseCookie refresh(String token) {
        return build(Spec.REFRESH, token, Duration.ofMillis(authJwtProps.refreshTokenExpiry()));
    }

    public ResponseCookie deleteAccess() {
        return delete(Spec.ACCESS);
    }

    public ResponseCookie deleteRefresh() {
        return delete(Spec.REFRESH);
    }

    private ResponseCookie build(Spec spec, String value, Duration maxAge) {
        ResponseCookie.ResponseCookieBuilder builder =
                ResponseCookie.from(spec.name, value).httpOnly(true).secure(cookieProps.secure())
                        .sameSite(cookieProps.sameSite()).path(spec.path).maxAge(maxAge);

        if (cookieProps.domain() != null && !cookieProps.domain().isBlank()) {
            builder.domain(cookieProps.domain());
        }

        return builder.build();
    }

    private ResponseCookie delete(Spec spec) {
        ResponseCookie.ResponseCookieBuilder builder =
                ResponseCookie.from(spec.name, "").httpOnly(true).secure(cookieProps.secure())
                        .sameSite(cookieProps.sameSite()).path(spec.path).maxAge(Duration.ZERO);

        if (cookieProps.domain() != null && !cookieProps.domain().isBlank()) {
            builder.domain(cookieProps.domain());
        }

        return builder.build();
    }

    enum Spec {
        ACCESS(ACCESS_COOKIE_NAME, "/api"), REFRESH(REFRESH_COOKIE_NAME, "/api/auth");

        final String name;
        final String path;

        Spec(String name, String path) {
            this.name = name;
            this.path = path;
        }
    }
}
