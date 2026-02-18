package com.yat2.episode.collaboration.ws;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;

import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.config.WebSocketProperties;
import com.yat2.episode.global.constant.AttributeKeys;
import com.yat2.episode.mindmap.jwt.MindmapJwtProvider;
import com.yat2.episode.mindmap.jwt.MindmapTicketPayload;


@Slf4j
@RequiredArgsConstructor
@Component
public class HandshakeInterceptor implements org.springframework.web.socket.server.HandshakeInterceptor {
    private final MindmapJwtProvider jwtProvider;
    private final WebSocketProperties webSocketProperties;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Map attributes
    ) {
        String token =
                org.springframework.web.util.UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams()
                        .getFirst("token");

        if (token == null || token.isBlank()) {
            log.warn("WebSocket 토큰 누락");
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        try {
            MindmapTicketPayload mindmapTicketPayload = jwtProvider.verify(token);

            UUID pathMindmapId = extractMindmapIdFromPath(request, response);

            if (!mindmapTicketPayload.mindmapId().equals(pathMindmapId)) {
                response.setStatusCode(HttpStatus.BAD_REQUEST);
                return false;
            }

            attributes.put(AttributeKeys.USER_ID, mindmapTicketPayload.userId());
            attributes.put(AttributeKeys.MINDMAP_ID, mindmapTicketPayload.mindmapId());
            return true;
        } catch (Exception e) {
            log.warn("WebSocket handshake 실패", e);
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Exception ex
    ) {
    }

    private UUID extractMindmapIdFromPath(ServerHttpRequest request, ServerHttpResponse response) {
        String path = request.getURI().getPath();

        String prefix = webSocketProperties.pathPrefix() + "/";
        if (!path.startsWith(prefix)) {
            response.setStatusCode(HttpStatus.BAD_REQUEST);
            return null;
        }

        String raw = path.substring(prefix.length());

        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            response.setStatusCode(HttpStatus.BAD_REQUEST);
            return null;
        }
    }
}
