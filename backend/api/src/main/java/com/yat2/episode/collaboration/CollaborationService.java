package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

import java.nio.ByteBuffer;
import java.util.UUID;
import java.util.concurrent.Executor;

import com.yat2.episode.global.constant.AttributeKeys;

@Slf4j
@RequiredArgsConstructor
@Service
public class CollaborationService {
    private final SessionRegistry sessionRegistry;
    private final RedisStreamStore redisStreamStore;
    private final Executor redisExecutor;

    public void handleConnect(WebSocketSession session) {
        sessionRegistry.addSession(getMindmapId(session), session);
    }

    public void processMessage(WebSocketSession sender, BinaryMessage message) {
        UUID roomId = getMindmapId(sender);

        byte[] payload = toByteArray(message.getPayload());

        sessionRegistry.broadcast(roomId, sender, payload);

        if (YjsProtocolUtil.isUpdateFrame(payload)) {
            try {
                redisExecutor.execute(() -> {
                    try {
                        redisStreamStore.appendUpdate(roomId, payload);
                    } catch (Exception e) {
                        log.warn("Redis append failed. roomId={}", roomId, e);
                    }
                });
            } catch (Exception e) {
                log.error("Redis append failed. roomId={}", roomId, e);
            }
        }
    }

    public void handleDisconnect(WebSocketSession session) {
        sessionRegistry.removeSession(getMindmapId(session), session);
    }

    private UUID getMindmapId(WebSocketSession session) {
        return (UUID) session.getAttributes().get(AttributeKeys.MINDMAP_ID);
    }

    private byte[] toByteArray(ByteBuffer buffer) {
        ByteBuffer dup = buffer.duplicate();
        byte[] bytes = new byte[dup.remaining()];
        dup.get(bytes);
        return bytes;
    }
}
