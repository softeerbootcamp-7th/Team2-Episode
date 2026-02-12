package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RequiredArgsConstructor
@Component
public class SessionRegistry {
    private final Map<UUID, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final WebSocketProperties wsProperties;

    public void addSession(UUID mindmapId, WebSocketSession session) {
        WebSocketSession decorated =
                new ConcurrentWebSocketSessionDecorator(session, wsProperties.sendTimeout(), wsProperties.bufferSize());
        rooms.computeIfAbsent(mindmapId, id -> ConcurrentHashMap.newKeySet()).add(decorated);
    }

    public void removeSession(UUID mindmapId, WebSocketSession session) {
        rooms.computeIfPresent(mindmapId, (id, sessions) -> {
            sessions.removeIf(s -> s.getId().equals(session.getId()));
            return sessions.isEmpty() ? null : sessions;
        });
    }

    public void broadcast(UUID mindmapId, WebSocketSession sender, byte[] payload) {
        Set<WebSocketSession> sessions = rooms.get(mindmapId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        BinaryMessage message = new BinaryMessage(payload);

        for (WebSocketSession session : sessions) {
            if (session.getId().equals(sender.getId())) {
                continue;
            }

            if (!session.isOpen()) {
                removeSession(mindmapId, session);
                continue;
            }

            try {
                session.sendMessage(message);
            } catch (Exception e) {
                removeSession(mindmapId, session);
            }


        }
    }
}
