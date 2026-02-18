package com.yat2.episode.collaboration.yjs;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.yat2.episode.collaboration.SessionRegistry;
import com.yat2.episode.collaboration.worker.JobPublisher;
import com.yat2.episode.collaboration.worker.UpdateAppender;

@Slf4j
@Component
public class YjsMessageRouter {
    private final SessionRegistry sessionRegistry;
    private final JobPublisher jobPublisher;
    private final UpdateAppender updateAppender;

    private final ConcurrentHashMap<UUID, ConcurrentHashMap<String, String>> pendingSyncs = new ConcurrentHashMap<>();

    public YjsMessageRouter(SessionRegistry sessionRegistry, JobPublisher jobPublisher, UpdateAppender updateAppender) {
        this.sessionRegistry = sessionRegistry;
        this.jobPublisher = jobPublisher;
        this.updateAppender = updateAppender;
    }

    public void routeIncoming(UUID roomId, WebSocketSession sender, byte[] payload) {
        if (YjsProtocolUtil.isAwarenessFrame(payload)) {
            sessionRegistry.broadcast(roomId, sender, payload);
            return;
        }

        if (YjsProtocolUtil.isUpdateFrame(payload)) {
            sessionRegistry.broadcast(roomId, sender, payload);
            saveUpdateAsync(roomId, payload);
            return;
        }

        if (YjsProtocolUtil.isSync1Frame(payload)) {
            handleSync1(roomId, sender, payload);
            return;
        }

        if (YjsProtocolUtil.isSync2Frame(payload)) {
            handleSync2(roomId, sender, payload);
            return;
        }

        sessionRegistry.broadcast(roomId, sender, payload);
    }

    public void executeSnapshot(UUID roomId) {
        jobPublisher.publishSnapshotAsync(roomId);
    }

    private void handleSync1(UUID roomId, WebSocketSession requester, byte[] payload) {

        List<WebSocketSession> candidates = sessionRegistry.findAllAlivePeers(roomId, requester.getId());

        if (candidates.isEmpty()) {
            sessionRegistry.unicast(roomId, requester, YjsProtocolUtil.emptySync2Frame());
            return;
        }

        candidates.sort(Comparator.comparingLong(sessionRegistry::getConnectedAt));

        ConcurrentHashMap<String, String> roomSyncs =
                pendingSyncs.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>());

        String requesterId = requester.getId();

        for (WebSocketSession provider : candidates) {
            String providerId = provider.getId();

            if (roomSyncs.putIfAbsent(providerId, requesterId) == null) {
                boolean ok = sessionRegistry.unicast(roomId, providerId, payload);
                if (!ok) {
                    roomSyncs.remove(providerId, requesterId);
                    continue;
                }
                return;
            }
        }
    }

    private void handleSync2(UUID roomId, WebSocketSession provider, byte[] payload) {
        String providerId = provider.getId();

        ConcurrentHashMap<String, String> roomSyncs = pendingSyncs.get(roomId);
        if (roomSyncs == null) return;

        String requesterId = roomSyncs.remove(providerId);

        if (requesterId != null) {
            sessionRegistry.unicast(roomId, requesterId, payload);
        }

        if (roomSyncs.isEmpty()) {
            pendingSyncs.remove(roomId, roomSyncs);
        }
    }

    public void onDisconnect(UUID roomId, String sessionId) {
        ConcurrentHashMap<String, String> roomSyncs = pendingSyncs.get(roomId);
        if (roomSyncs == null) return;

        roomSyncs.remove(sessionId);

        roomSyncs.entrySet().removeIf(e -> sessionId.equals(e.getValue()));

        if (roomSyncs.isEmpty()) {
            pendingSyncs.remove(roomId, roomSyncs);
        }
    }

    private void saveUpdateAsync(UUID roomId, byte[] payload) {
        updateAppender.appendUpdateAsync(roomId, payload);
    }

}

