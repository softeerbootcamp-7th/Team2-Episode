package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.yat2.episode.collaboration.config.WebSocketProperties;

import static com.yat2.episode.global.constant.AttributeKeys.CONNECTED_AT;

@RequiredArgsConstructor
@Component
public class SessionRegistry {
    private final ConcurrentHashMap<UUID, ConcurrentHashMap<String, WebSocketSession>> rooms =
            new ConcurrentHashMap<>();

    private final WebSocketProperties wsProperties;

    public void addSession(UUID mindmapId, WebSocketSession session) {
        session.getAttributes().putIfAbsent(CONNECTED_AT, System.nanoTime());

        WebSocketSession decorated =
                new ConcurrentWebSocketSessionDecorator(session, wsProperties.sendTimeout(), wsProperties.bufferSize());

        rooms.computeIfAbsent(mindmapId, id -> new ConcurrentHashMap<>()).put(decorated.getId(), decorated);
    }

    public void removeSession(UUID mindmapId, WebSocketSession session) {
        rooms.computeIfPresent(mindmapId, (id, sessions) -> {
            sessions.remove(session.getId());
            return sessions.isEmpty() ? null : sessions;
        });
    }

    public void broadcast(UUID mindmapId, WebSocketSession sender, byte[] payload) {
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(mindmapId);
        if (sessions == null || sessions.isEmpty()) return;

        BinaryMessage message = new BinaryMessage(payload);
        final List<String> deadSessionIds = new ArrayList<>();

        for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
            String sessionId = entry.getKey();
            WebSocketSession session = entry.getValue();

            if (sender != null && sessionId.equals(sender.getId())) continue;

            if (!session.isOpen()) {
                deadSessionIds.add(sessionId);
                continue;
            }

            try {
                session.sendMessage(message);
            } catch (Exception e) {
                deadSessionIds.add(sessionId);
            }
        }

        for (String deadId : deadSessionIds) {
            sessions.remove(deadId);
        }

        if (sessions.isEmpty()) {
            rooms.remove(mindmapId, sessions);
        }
    }


    public boolean unicast(UUID mindmapId, String receiverSessionId, byte[] payload) {
        Set<WebSocketSession> sessions = rooms.get(mindmapId);
        if (sessions == null || sessions.isEmpty()) return false;

        BinaryMessage message = new BinaryMessage(payload);

        for (WebSocketSession session : sessions) {
            if (!session.getId().equals(receiverSessionId)) continue;

            if (!session.isOpen()) {
                removeSession(mindmapId, session);
                return false;
            }

            try {
                session.sendMessage(message);
                return true;
            } catch (Exception e) {
                removeSession(mindmapId, session);
                return false;
            }
        }
        return false;
    }

    public boolean unicast(UUID mindmapId, WebSocketSession receiver, byte[] payload) {
        return unicast(mindmapId, receiver.getId(), payload);
    }

    public Optional<WebSocketSession> findOldestAlivePeer(UUID mindmapId, String excludeSessionId) {
        Set<WebSocketSession> sessions = rooms.get(mindmapId);
        if (sessions == null || sessions.isEmpty()) {
            return Optional.empty();
        }

        WebSocketSession best = null;
        long bestAt = Long.MAX_VALUE;

        for (WebSocketSession s : sessions) {
            if (!s.isOpen()) {
                continue;
            }
            if (excludeSessionId != null && excludeSessionId.equals(s.getId())) continue;

            long at = getConnectedAt(s);
            if (at < bestAt) {
                bestAt = at;
                best = s;
            }
        }

        return Optional.ofNullable(best);
    }

    private long getConnectedAt(WebSocketSession session) {
        return (Long) session.getAttributes().get(CONNECTED_AT);
    }
}
