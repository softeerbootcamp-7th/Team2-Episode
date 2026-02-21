package com.yat2.episode.collaboration.yjs;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.yat2.episode.collaboration.SessionRegistry;
import com.yat2.episode.collaboration.redis.LastEntryIdStore;
import com.yat2.episode.collaboration.redis.UpdateStreamStore;
import com.yat2.episode.collaboration.worker.UpdateAppender;

import static com.yat2.episode.global.constant.AttributeKeys.IS_SYNCED;
import static com.yat2.episode.global.constant.AttributeKeys.LAST_ENTRY_ID;

@Slf4j
@RequiredArgsConstructor
@Component
public class YjsMessageRouter {
    private final SessionRegistry sessionRegistry;
    private final UpdateAppender updateAppender;
    private final UpdateStreamStore updateStreamStore;
    private final LastEntryIdStore lastEntryIdStore;

    private final ConcurrentHashMap<UUID, ConcurrentHashMap<String, String>> pendingSyncs = new ConcurrentHashMap<>();

    public void routeIncoming(UUID roomId, WebSocketSession sender, byte[] payload) {
        if (YjsProtocolUtil.isAwarenessFrame(payload)) {
            sessionRegistry.broadcast(roomId, sender, payload);
            return;
        }

        if (YjsProtocolUtil.isUpdateFrame(payload)) {
            sessionRegistry.broadcast(roomId, sender, payload);
            updateAppender.appendUpdateAsync(roomId, payload);
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

        if (delegateToProvider(roomId, requester, payload)) {
            return;
        }

        if (!handleSoloSync(roomId, requester)) {
            return;
        }

        sessionRegistry.unicast(roomId, requester.getId(), YjsProtocolUtil.emptySync2Frame());
    }

    private boolean delegateToProvider(UUID roomId, WebSocketSession requester, byte[] payload) {
        List<WebSocketSession> candidates = sessionRegistry.findAllAlivePeers(roomId, requester.getId());

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
                return true;
            }
        }

        return false;
    }

    private boolean handleSoloSync(UUID roomId, WebSocketSession requester) {
        boolean isSynced = Boolean.TRUE.equals(requester.getAttributes().get(IS_SYNCED));

        if (isSynced) {
            return true;
        }

        List<byte[]> updates;
        try {
            updates = updateStreamStore.readAllUpdates(roomId);
        } catch (Exception e) {
            log.error("Error reading updates for room {}", roomId, e);
            updates = List.of();
        }

        if (updates.isEmpty()) {
            if (!validateLastEntryId(roomId, requester)) {
                return false;
            }
        } else {
            if (!sendReplay(roomId, requester, updates)) {
                return false;
            }
        }

        requester.getAttributes().put(IS_SYNCED, true);
        requester.getAttributes().remove(LAST_ENTRY_ID);

        return true;
    }

    private boolean validateLastEntryId(UUID roomId, WebSocketSession requester) {
        String runnerLastEntry;
        try {
            runnerLastEntry = lastEntryIdStore.get(roomId).orElse("0-0");
        } catch (Exception e) {
            log.error("Error reading lastEntryId for room {}", roomId, e);
            closeSessionQuietly(requester, CloseStatus.SERVER_ERROR);
            return false;
        }
        String clientLastEntry = String.valueOf(requester.getAttributes().getOrDefault(LAST_ENTRY_ID, "0-0"));

        if (!clientLastEntry.equals(runnerLastEntry)) {
            closeSessionQuietly(requester, new CloseStatus(4000, "LAST_ENTRY_MISMATCH"));
            return false;
        }

        return true;
    }

    private boolean sendReplay(UUID roomId, WebSocketSession requester, List<byte[]> updates) {
        String requesterId = requester.getId();

        boolean ok = sessionRegistry.unicastAll(roomId, requesterId, updates);

        if (!ok && requester.isOpen()) {
            ok = sessionRegistry.unicastAll(roomId, requesterId, updates);
        }

        if (!ok) {
            closeSessionQuietly(requester, CloseStatus.SERVER_ERROR);
            return false;
        }

        return true;
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

    private void closeSessionQuietly(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (Exception ignored) {
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

}

