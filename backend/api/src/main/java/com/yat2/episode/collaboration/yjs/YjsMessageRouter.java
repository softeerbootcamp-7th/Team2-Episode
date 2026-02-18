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

import com.yat2.episode.collaboration.SessionRegistry;
import com.yat2.episode.collaboration.redis.JobStreamStore;
import com.yat2.episode.collaboration.redis.UpdateStreamStore;

@Slf4j
@Component
public class YjsMessageRouter {
    private final SessionRegistry sessionRegistry;
    private final UpdateStreamStore updateStreamStore;
    private final Executor redisExecutor;
    private final Executor jobExecutor;
    private final JobStreamStore jobStreamStore;

    private final ConcurrentHashMap<UUID, ConcurrentHashMap<String, String>> pendingSyncs = new ConcurrentHashMap<>();

    public YjsMessageRouter(
            SessionRegistry sessionRegistry, UpdateStreamStore updateStreamStore,
            @Qualifier("redisExecutor") Executor redisExecutor,
            @Qualifier("jobExecutor") Executor jobExecutor, JobStreamStore jobStreamStore
    ) {
        this.sessionRegistry = sessionRegistry;
        this.updateStreamStore = updateStreamStore;
        this.redisExecutor = redisExecutor;
        this.jobExecutor = jobExecutor;
        this.jobStreamStore = jobStreamStore;
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
                tryUpdateAppend(roomId, payload);
            });
        } catch (Exception e) {
            tryPublishSync(roomId);
        }
    }

    private void tryPublishSync(UUID roomId) {
        try {
            jobStreamStore.publishSync(roomId);
        } catch (Exception e) {
            log.error("Sync publish failed. roomId={}", roomId, e);
        }
    }

    private void tryUpdateAppend(UUID roomId, byte[] payload) {
        for (int i = 0; i < 5; i++) {
            try {
                updateStreamStore.appendUpdate(roomId, payload);
                return;
            } catch (Exception e) {
                if (isFatalRedisWrite(e)) {
                    log.error("Fatal redis write. roomId={}", roomId, e);

                    // todo: 다른 방법 도모..?
                    // 저희가 같은 redis 인스턴스 내에서 job 처리를 하고 있어서, fatal error 시에는 sync 시도가 무의미하다고 판단됩니다.
                    return;
                }
                log.warn("Redis append failed (retryable). roomId={}, attempt={}", roomId, i + 1, e);
            }
        }
        tryPublishSync(roomId);
    }

    private boolean isFatalRedisWrite(Exception exception) {
        String msg = getRootMessage(exception);

        return msg.contains("OOM command not allowed") || msg.contains("MISCONF") || msg.contains("READONLY") ||
               msg.contains("NOPERM");
    }

    private String getRootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null) {
            t = t.getCause();
        }
        return t.getMessage() == null ? "" : t.getMessage();
    }

}

