package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

import java.nio.ByteBuffer;
import java.util.UUID;

import com.yat2.episode.global.constant.AttributeKeys;

@Slf4j
@RequiredArgsConstructor
@Service
public class CollaborationService {
    private final SessionRegistry sessionRegistry;
    private final RedisStreamRepository redisStreamRepository;

    public void handleConnect(WebSocketSession session) {
        sessionRegistry.addSession(getMindmapId(session), session);
    }

    public void processMessage(WebSocketSession sender, BinaryMessage message) {
        ByteBuffer buffer = message.getPayload();
        byte[] payload = new byte[buffer.remaining()];
        buffer.get(payload);

        sessionRegistry.broadcast(getMindmapId(sender), sender, payload);
    }

    public void handleDisconnect(WebSocketSession session) {
        sessionRegistry.removeSession(getMindmapId(session), session);
    }

    private UUID getMindmapId(WebSocketSession session) {
        return (UUID) session.getAttributes().get(AttributeKeys.MINDMAP_ID);
    }
}
