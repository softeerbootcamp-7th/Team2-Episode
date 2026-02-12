package com.yat2.episode.collaboration;

import com.yat2.episode.mindmap.jwt.MindmapJwtProvider;
import com.yat2.episode.mindmap.jwt.MindmapTicketPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;

import java.util.Map;

@RequiredArgsConstructor
@Component
public class HandshakeInterceptor implements org.springframework.web.socket.server.HandshakeInterceptor {
    private final MindmapJwtProvider jwtProvider;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Map attributes
    ) {
        String query = request.getURI().getQuery();
        String token = extractToken(query);

        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            MindmapTicketPayload mindmapTicketPayload = jwtProvider.verify(token);

            // todo: global constants 값으로 키 변경
            attributes.put("userId", mindmapTicketPayload.userId());
            attributes.put("mindmapId", mindmapTicketPayload.mindmapId());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Exception ex
    ) {
    }

    private String extractToken(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }

        return java.util.Arrays.stream(query.split("&"))
                .filter(param -> param.startsWith("token="))
                .map(param -> param.substring(6))
                .findFirst()
                .orElse(null);
    }
}
