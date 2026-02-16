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

        rooms.compute(mindmapId, (id, sessions) -> {
            if (sessions == null) {
                sessions = new ConcurrentHashMap<>();
            }
            sessions.put(decorated.getId(), decorated);
            return sessions;
        });
    }

    public void removeSession(UUID mindmapId, WebSocketSession session) {
        removeSession(mindmapId, session.getId());
    }

    private void removeSession(UUID mindmapId, String sessionId) {
        rooms.computeIfPresent(mindmapId, (id, sessions) -> {
            sessions.remove(sessionId);
            return sessions.isEmpty() ? null : sessions;
        });
    }

    public void broadcast(UUID mindmapId, WebSocketSession sender, byte[] payload) {
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(mindmapId);
        if (sessions == null || sessions.isEmpty()) return;

        BinaryMessage message = new BinaryMessage(payload);
        List<String> deadSessionIds = new ArrayList<>();

        final String senderId = (sender == null) ? null : sender.getId();

        for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
            String sessionId = entry.getKey();
            WebSocketSession session = entry.getValue();

            if (senderId != null && senderId.equals(sessionId)) {
                continue;
            }

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
            removeSession(mindmapId, deadId);
        }
    }

    public boolean unicast(UUID mindmapId, String receiverSessionId, byte[] payload) {
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(mindmapId);
        if (sessions == null || sessions.isEmpty()) return false;

        WebSocketSession session = sessions.get(receiverSessionId);
        if (session == null) return false;

        if (!session.isOpen()) {
            removeSession(mindmapId, receiverSessionId);
            return false;
        }

        try {
            session.sendMessage(new BinaryMessage(payload));
            return true;
        } catch (Exception e) {
            removeSession(mindmapId, receiverSessionId);
            return false;
        }
    }

    public boolean unicast(UUID mindmapId, WebSocketSession receiver, byte[] payload) {
        return unicast(mindmapId, receiver.getId(), payload);
    }

    public Optional<WebSocketSession> findOldestAlivePeer(UUID mindmapId, String excludeSessionId) {
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(mindmapId);
        if (sessions == null || sessions.isEmpty()) return Optional.empty();

        WebSocketSession best = null;
        long bestAt = Long.MAX_VALUE;

        List<String> dead = null;

        for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
            String sessionId = entry.getKey();
            WebSocketSession s = entry.getValue();

            if (excludeSessionId != null && excludeSessionId.equals(sessionId)) continue;

            if (!s.isOpen()) {
                if (dead == null) dead = new ArrayList<>();
                dead.add(sessionId);
                continue;
            }

            long at = getConnectedAt(s);
            if (at < bestAt) {
                bestAt = at;
                best = s;
            }
        }

        if (dead != null) {
            for (String id : dead) removeSession(mindmapId, id);
        }

        return Optional.ofNullable(best);
    }

    private long getConnectedAt(WebSocketSession session) {
        return (Long) session.getAttributes().get(CONNECTED_AT);
    }
}
