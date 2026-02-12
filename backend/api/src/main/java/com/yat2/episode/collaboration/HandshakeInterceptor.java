package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;

import java.util.Map;

import com.yat2.episode.mindmap.jwt.MindmapJwtProvider;

@RequiredArgsConstructor
@Component
public class HandshakeInterceptor implements org.springframework.web.socket.server.HandshakeInterceptor {
    private final MindmapJwtProvider jwtProvider;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Map attributes
    ) {
        //TODO
        return false;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Exception ex
    ) {
        //TODO
    }

    private String extractToken(String query) {
        //TODO
        return null;
    }
}
