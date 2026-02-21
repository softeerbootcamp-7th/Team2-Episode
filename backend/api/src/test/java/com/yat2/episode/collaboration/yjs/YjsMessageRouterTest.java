package com.yat2.episode.collaboration.yjs;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.collaboration.SessionRegistry;
import com.yat2.episode.collaboration.redis.LastEntryIdStore;
import com.yat2.episode.collaboration.redis.UpdateStreamStore;
import com.yat2.episode.collaboration.worker.UpdateAppender;

import static com.yat2.episode.global.constant.AttributeKeys.IS_SYNCED;
import static com.yat2.episode.global.constant.AttributeKeys.LAST_ENTRY_ID;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("YjsMessageRouter 단위 테스트")
class YjsMessageRouterTest {

    @Mock
    SessionRegistry sessionRegistry;

    @Mock
    UpdateAppender updateAppender;

    @Mock
    UpdateStreamStore updateStreamStore;

    @Mock
    LastEntryIdStore lastEntryIdStore;

    YjsMessageRouter router;

    @BeforeEach
    void setUp() {
        router = new YjsMessageRouter(sessionRegistry, updateAppender, updateStreamStore, lastEntryIdStore);
    }

    private static byte[] awarenessFrame() {
        return new byte[]{ 1, 9, 9 };
    }

    private static byte[] updateFrame() {
        return new byte[]{ 0, 2, 1, 2, 3, 4 };
    }

    private static byte[] sync1Frame() {
        return new byte[]{ 0, 0, 7, 7 };
    }

    private static byte[] sync2Frame() {
        return new byte[]{ 0, 1, 8, 8 };
    }

    private static byte[] otherFrame() {
        return new byte[]{ 9, 9, 9 };
    }

    @Nested
    @DisplayName("Awareness / Default 브로드캐스트")
    class BroadcastTests {

        @Test
        @DisplayName("Awareness 프레임이면 broadcast만 수행한다")
        void routeIncoming_whenAwareness_broadcastOnly() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession sender = mock(WebSocketSession.class);

            byte[] payload = awarenessFrame();

            router.routeIncoming(roomId, sender, payload);

            verify(sessionRegistry).broadcast(eq(roomId), eq(sender), eq(payload));
            verifyNoInteractions(updateAppender);
        }

        @Test
        @DisplayName("어떤 프레임에도 해당하지 않으면 broadcast한다")
        void routeIncoming_whenOther_broadcast() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession sender = mock(WebSocketSession.class);

            byte[] payload = otherFrame();

            router.routeIncoming(roomId, sender, payload);

            verify(sessionRegistry).broadcast(eq(roomId), eq(sender), eq(payload));
            verifyNoInteractions(updateAppender);
        }
    }

    @Nested
    @DisplayName("Update 프레임 처리")
    class UpdateTests {

        @Test
        @DisplayName("Update 프레임이면 broadcast 후 UpdateAppender에 appendUpdateAsync를 위임한다")
        void routeIncoming_whenUpdate_broadcastAndAppend() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession sender = mock(WebSocketSession.class);

            byte[] payload = updateFrame();

            router.routeIncoming(roomId, sender, payload);

            verify(sessionRegistry).broadcast(eq(roomId), eq(sender), eq(payload));
            verify(updateAppender).appendUpdateAsync(eq(roomId), eq(payload));
        }
    }

    @Nested
    @DisplayName("Sync1 / Sync2 라우팅")
    class SyncTests {

        @Test
        @DisplayName("Sync1에서 제공자가 없으면 requester에게 emptySync2Frame을 unicast한다")
        void routeIncoming_sync1_noCandidates_unicastEmptySync2() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession requester = mock(WebSocketSession.class);

            when(requester.getId()).thenReturn("REQ");
            when(sessionRegistry.findAllAlivePeers(any(UUID.class), eq("REQ"))).thenReturn(new ArrayList<>());

            when(updateStreamStore.readAllUpdates(roomId)).thenReturn(List.of());
            when(lastEntryIdStore.get(roomId)).thenReturn(Optional.of("0-0"));

            router.routeIncoming(roomId, requester, sync1Frame());

            ArgumentCaptor<byte[]> captor = ArgumentCaptor.forClass(byte[].class);

            verify(sessionRegistry).unicast(eq(roomId), eq("REQ"), captor.capture());

            assertArrayEquals(YjsProtocolUtil.emptySync2Frame(), captor.getValue());
        }

        @Test
        @DisplayName("Sync1에서 connectedAt이 빠른 provider에게 sync1을 unicast한다")
        void routeIncoming_sync1_candidates_sorted_pickFirst() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession requester = mock(WebSocketSession.class);
            when(requester.getId()).thenReturn("REQ");

            WebSocketSession p1 = mock(WebSocketSession.class);
            when(p1.getId()).thenReturn("P1");

            WebSocketSession p2 = mock(WebSocketSession.class);

            when(sessionRegistry.findAllAlivePeers(roomId, "REQ")).thenReturn(new ArrayList<>(List.of(p2, p1)));

            when(sessionRegistry.getConnectedAt(p1)).thenReturn(10L);
            when(sessionRegistry.getConnectedAt(p2)).thenReturn(20L);

            when(sessionRegistry.unicast(eq(roomId), eq("P1"), any())).thenReturn(true);

            router.routeIncoming(roomId, requester, sync1Frame());

            verify(sessionRegistry).unicast(eq(roomId), eq("P1"), any());
            verify(sessionRegistry, never()).unicast(eq(roomId), eq("P2"), any());
        }

        @Test
        @DisplayName("Sync1에서 첫 provider unicast 실패하면 다음 provider로 넘어간다")
        void routeIncoming_sync1_firstProviderFails_thenTryNext() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession requester = mock(WebSocketSession.class);
            when(requester.getId()).thenReturn("REQ");

            WebSocketSession p1 = mock(WebSocketSession.class);
            when(p1.getId()).thenReturn("P1");

            WebSocketSession p2 = mock(WebSocketSession.class);
            when(p2.getId()).thenReturn("P2");

            when(sessionRegistry.findAllAlivePeers(roomId, "REQ")).thenReturn(new ArrayList<>(List.of(p1, p2)));

            when(sessionRegistry.getConnectedAt(any())).thenReturn(10L);

            when(sessionRegistry.unicast(eq(roomId), eq("P1"), any())).thenReturn(false);
            when(sessionRegistry.unicast(eq(roomId), eq("P2"), any())).thenReturn(true);

            router.routeIncoming(roomId, requester, sync1Frame());

            InOrder order = inOrder(sessionRegistry);
            order.verify(sessionRegistry).unicast(eq(roomId), eq("P1"), any());
            order.verify(sessionRegistry).unicast(eq(roomId), eq("P2"), any());
        }

        @Test
        @DisplayName("Sync1 Solo updates가 있으면 replay 후 IS_SYNCED=true, LAST_ENTRY_ID 제거, sync2 전송")
        void routeIncoming_sync1_solo_withUpdates_replayAndSync2() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession requester = mock(WebSocketSession.class);
            when(requester.getId()).thenReturn("REQ");

            var attrs = new java.util.HashMap<String, Object>();
            attrs.put(IS_SYNCED, false);
            attrs.put(LAST_ENTRY_ID, "0-0");
            when(requester.getAttributes()).thenReturn(attrs);

            when(sessionRegistry.findAllAlivePeers(any(UUID.class), eq("REQ"))).thenReturn(new ArrayList<>());

            List<byte[]> updates = List.of(new byte[]{ 1 }, new byte[]{ 2 });
            when(updateStreamStore.readAllUpdates(roomId)).thenReturn(updates);

            when(sessionRegistry.unicastAll(roomId, "REQ", updates)).thenReturn(true);

            router.routeIncoming(roomId, requester, sync1Frame());

            verify(sessionRegistry).unicastAll(roomId, "REQ", updates);
            verify(sessionRegistry).unicast(eq(roomId), eq("REQ"), eq(YjsProtocolUtil.emptySync2Frame()));

            org.assertj.core.api.Assertions.assertThat(attrs.get(IS_SYNCED)).isEqualTo(true);
            org.assertj.core.api.Assertions.assertThat(attrs).doesNotContainKey(LAST_ENTRY_ID);
        }

        @Test
        @DisplayName("Sync1 Solo replay 전송 실패 시 SERVER_ERROR로 close하고 sync2는 보내지 않는다")
        void routeIncoming_sync1_solo_replayFails_closeAndNoSync2() throws Exception {
            UUID roomId = UUID.randomUUID();

            WebSocketSession requester = mock(WebSocketSession.class);
            when(requester.getId()).thenReturn("REQ");

            var attrs = new java.util.HashMap<String, Object>();
            attrs.put(IS_SYNCED, false);
            attrs.put(LAST_ENTRY_ID, "0-0");
            when(requester.getAttributes()).thenReturn(attrs);

            when(sessionRegistry.findAllAlivePeers(any(UUID.class), eq("REQ"))).thenReturn(new ArrayList<>());

            List<byte[]> updates = List.of(new byte[]{ 1 });
            when(updateStreamStore.readAllUpdates(roomId)).thenReturn(updates);

            when(sessionRegistry.unicastAll(roomId, "REQ", updates)).thenReturn(false);

            router.routeIncoming(roomId, requester, sync1Frame());

            verify(requester).close(eq(CloseStatus.SERVER_ERROR));
            verify(sessionRegistry, never()).unicast(eq(roomId), eq("REQ"), eq(YjsProtocolUtil.emptySync2Frame()));

            org.assertj.core.api.Assertions.assertThat(attrs.get(IS_SYNCED)).isEqualTo(false);
        }

        @Test
        @DisplayName("Sync2가 오면 pendingSyncs에 저장된 requester에게 그대로 포워딩한다")
        void routeIncoming_sync2_forwardsToRequester() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession requester = mock(WebSocketSession.class);
            when(requester.getId()).thenReturn("REQ");

            WebSocketSession provider = mock(WebSocketSession.class);
            when(provider.getId()).thenReturn("P1");

            when(sessionRegistry.findAllAlivePeers(any(UUID.class), eq("REQ"))).thenReturn(
                    new ArrayList<>(List.of(provider)));

            when(sessionRegistry.unicast(eq(roomId), eq("P1"), any())).thenReturn(true);

            router.routeIncoming(roomId, requester, sync1Frame());
            router.routeIncoming(roomId, provider, sync2Frame());

            verify(sessionRegistry).unicast(eq(roomId), eq("REQ"), eq(sync2Frame()));
        }
    }
}
