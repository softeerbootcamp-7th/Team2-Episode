package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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

    public int removeSession(UUID mindmapId, WebSocketSession session) {
        return removeSession(mindmapId, session.getId());
    }

    private int removeSession(UUID mindmapId, String sessionId) {
        ConcurrentHashMap<String, WebSocketSession> updated = rooms.computeIfPresent(mindmapId, (id, sessions) -> {
            sessions.remove(sessionId);
            return sessions.isEmpty() ? null : sessions;
        });
        return updated == null ? 0 : updated.size();
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
            } catch (Exception ignored) {
            }
        }

        for (String deadId : deadSessionIds) {
            removeSession(mindmapId, deadId);
        }
    }

    public boolean unicast(UUID mindmapId, String receiverSessionId, byte[] payload) {
        WebSocketSession session = getAliveSession(mindmapId, receiverSessionId);
        if (session == null) return false;

        try {
            session.sendMessage(new BinaryMessage(payload));
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public boolean unicastAll(UUID mindmapId, String receiverSessionId, List<byte[]> payloads) {
        if (payloads == null || payloads.isEmpty()) return true;

        WebSocketSession session = getAliveSession(mindmapId, receiverSessionId);
        if (session == null) return false;

        try {
            for (byte[] payload : payloads) {
                if (payload == null) continue;
                session.sendMessage(new BinaryMessage(payload));
            }
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private WebSocketSession getAliveSession(UUID roomId, String sessionId) {
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(roomId);
        if (sessions == null || sessions.isEmpty()) return null;

        WebSocketSession session = sessions.get(sessionId);
        if (session == null) return null;

        if (!session.isOpen()) {
            removeSession(roomId, sessionId);
            return null;
        }

        return session;
    }

    public List<WebSocketSession> findAllAlivePeers(UUID roomId, String excludeId) {
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(roomId);
        if (sessions == null) return List.of();

        List<WebSocketSession> result = new ArrayList<>(sessions.size());
        for (WebSocketSession s : sessions.values()) {
            if (s.isOpen() && !excludeId.equals(s.getId())) {
                result.add(s);
            }
        }
        return result;
    }

    public long getConnectedAt(WebSocketSession session) {
        return (Long) session.getAttributes().get(CONNECTED_AT);
    }
}
