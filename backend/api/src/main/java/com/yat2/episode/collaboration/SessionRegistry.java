package com.yat2.episode.collaboration;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SessionRegistry {
    private final Map<UUID, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    public void addSession(UUID mindmapId, WebSocketSession session) {
        //TODO
    }

    public void removeSession(UUID mindmapId, WebSocketSession session) {
        //TODO
    }

    public void broadcast(UUID mindmapId, WebSocketSession sender, byte[] payload) {
        //TODO
    }
}
