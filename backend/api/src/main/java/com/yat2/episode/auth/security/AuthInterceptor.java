package com.yat2.episode.auth.security;

import com.yat2.episode.auth.cookie.AuthCookieResolver;
import com.yat2.episode.auth.jwt.JwtProvider;
import com.yat2.episode.global.constant.RequestAttrs;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
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
    private final JwtProvider jwtProvider;
    private final AuthCookieResolver cookieResolver;

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) {
        if (!(handler instanceof HandlerMethod hm)) return true;

        if (hm.hasMethodAnnotation(Public.class) || hm.getBeanType().isAnnotationPresent(Public.class)) {
            return true;
        }

        String token = cookieResolver.findAccessToken(request)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED));

        Long userId = jwtProvider.verifyAccessTokenAndGetUserId(token);
        request.setAttribute(RequestAttrs.USER_ID, userId);

        return true;
    }
}