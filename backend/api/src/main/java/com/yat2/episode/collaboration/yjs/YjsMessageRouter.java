package com.yat2.episode.collaboration.yjs;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;

import com.yat2.episode.collaboration.RedisStreamStore;
import com.yat2.episode.collaboration.SessionRegistry;

@Slf4j
@Component
public class YjsMessageRouter {
    private final SessionRegistry sessionRegistry;
    private final RedisStreamStore redisStreamStore;
    private final Executor redisExecutor;

    private final ConcurrentHashMap<UUID, ConcurrentHashMap<String, String>> pendingSyncs = new ConcurrentHashMap<>();

    public YjsMessageRouter(
            SessionRegistry sessionRegistry, RedisStreamStore redisStreamStore,
            @Qualifier("redisExecutor") Executor redisExecutor
    ) {
        this.sessionRegistry = sessionRegistry;
        this.redisStreamStore = redisStreamStore;
        this.redisExecutor = redisExecutor;
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
        try {
            redisExecutor.execute(() -> {
                try {
                    redisStreamStore.appendUpdate(roomId, payload);
                } catch (Exception e) {
                    log.warn("Redis append failed. roomId={}", roomId, e);
                }
            });
        } catch (Exception e) {
            log.error("Redis schedule failed", e);
        }
    }
}

