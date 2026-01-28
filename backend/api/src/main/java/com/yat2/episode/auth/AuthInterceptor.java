package com.yat2.episode.auth;

import com.yat2.episode.auth.annotation.Public;
import com.yat2.episode.auth.token.JwtProvider;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATTR_USER_ID = "userId";
    private static final String ACCESS_COOKIE = "access_token";

    private final JwtProvider jwtProvider;

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
        if (!(handler instanceof HandlerMethod hm)) return true;

        if (hm.hasMethodAnnotation(Public.class) || hm.getBeanType().isAnnotationPresent(Public.class)) {
            return true;
        }

        String token = extractAccessToken(request);
        if (token == null || token.isBlank()) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        Long userId = jwtProvider.verifyAccessTokenAndGetUserId(token);
        request.setAttribute(ATTR_USER_ID, userId);

        return true;
    }

    private String extractAccessToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (ACCESS_COOKIE.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}