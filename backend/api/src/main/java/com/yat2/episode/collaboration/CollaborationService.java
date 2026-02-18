package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

import java.nio.ByteBuffer;
import java.util.UUID;

import com.yat2.episode.collaboration.redis.JobStreamStore;
import com.yat2.episode.collaboration.yjs.YjsMessageRouter;
import com.yat2.episode.global.constant.AttributeKeys;

@Slf4j
@RequiredArgsConstructor
@Service
public class CollaborationService {
    private final SessionRegistry sessionRegistry;
    private final YjsMessageRouter yjsMessageRouter;
    private final JobStreamStore jobStreamStore;

    public void handleConnect(WebSocketSession session) {
        UUID roomId = getMindmapId(session);
        sessionRegistry.addSession(roomId, session);
    }

    public void processMessage(WebSocketSession sender, BinaryMessage message) {
        UUID roomId = getMindmapId(sender);
        if (roomId == null) {
            log.error("Mindmap Id is null.");
            return;
        }

        byte[] payload = toByteArray(message.getPayload());

        yjsMessageRouter.routeIncoming(roomId, sender, payload);
    }

    public void handleDisconnect(WebSocketSession session) {
        UUID roomId = getMindmapId(session);
        if (roomId == null) return;

        yjsMessageRouter.onDisconnect(roomId, session.getId());

        int remainingSession = sessionRegistry.removeSession(roomId, session);
        if (remainingSession == 0) {
            jobStreamStore.publishSnapshot(roomId);
        }
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
