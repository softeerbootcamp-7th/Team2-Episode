package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;

import java.util.Map;

import com.yat2.episode.global.constant.AttributeKeys;
import com.yat2.episode.mindmap.jwt.MindmapJwtProvider;
import com.yat2.episode.mindmap.jwt.MindmapTicketPayload;

@Slf4j
@RequiredArgsConstructor
@Component
public class HandshakeInterceptor implements org.springframework.web.socket.server.HandshakeInterceptor {
    private final MindmapJwtProvider jwtProvider;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Map attributes
    ) {
        String token =
                org.springframework.web.util.UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams()
                        .getFirst("token");

        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            MindmapTicketPayload mindmapTicketPayload = jwtProvider.verify(token);

            attributes.put(AttributeKeys.USER_ID, mindmapTicketPayload.userId());
            attributes.put(AttributeKeys.MINDMAP_ID, mindmapTicketPayload.mindmapId());
            return true;
        } catch (Exception e) {
            log.warn("WebSocket handshake 실패", e);
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Exception ex
    ) {
    }
}
