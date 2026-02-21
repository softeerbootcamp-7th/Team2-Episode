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
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.collaboration.SessionRegistry;
import com.yat2.episode.collaboration.redis.UpdateStreamStore;
import com.yat2.episode.collaboration.worker.JobPublisher;
import com.yat2.episode.collaboration.worker.UpdateAppender;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("YjsMessageRouter 단위 테스트")
class YjsMessageRouterTest {

    @Mock
    SessionRegistry sessionRegistry;

    @Mock
    JobPublisher jobPublisher;

    @Mock
    UpdateAppender updateAppender;

    @Mock
    UpdateStreamStore updateStreamStore;

    YjsMessageRouter router;

    @BeforeEach
    void setUp() {
        router = new YjsMessageRouter(sessionRegistry, updateAppender, updateStreamStore);
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

            ArgumentCaptor<byte[]> captor = ArgumentCaptor.forClass(byte[].class);
            verify(sessionRegistry).broadcast(eq(roomId), eq(sender), captor.capture());
            assertArrayEquals(payload, captor.getValue());

            verifyNoInteractions(updateAppender);
            verifyNoInteractions(jobPublisher);
            verifyNoMoreInteractions(sessionRegistry);
        }

        @Test
        @DisplayName("어떤 프레임에도 해당하지 않으면 broadcast한다")
        void routeIncoming_whenOther_broadcast() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession sender = mock(WebSocketSession.class);

            byte[] payload = otherFrame();

            router.routeIncoming(roomId, sender, payload);

            verify(sessionRegistry).broadcast(eq(roomId), eq(sender), any(byte[].class));
            verifyNoInteractions(updateAppender);
            verifyNoInteractions(jobPublisher);
        }
    }

    @Nested
    @DisplayName("Update 프레임 처리")
    class UpdateTests {

        @Test
        @DisplayName("Update 프레임이면 broadcast 후 UpdateAppender에 appendUpdateAsync를 위임한다")
        void routeIncoming_whenUpdate_broadcastsAndDelegatesToAppender() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession sender = mock(WebSocketSession.class);

            byte[] payload = updateFrame();

            router.routeIncoming(roomId, sender, payload);

            ArgumentCaptor<byte[]> broadcastCaptor = ArgumentCaptor.forClass(byte[].class);
            verify(sessionRegistry).broadcast(eq(roomId), eq(sender), broadcastCaptor.capture());
            assertArrayEquals(payload, broadcastCaptor.getValue());

            ArgumentCaptor<byte[]> payloadCaptor = ArgumentCaptor.forClass(byte[].class);
            verify(updateAppender).appendUpdateAsync(eq(roomId), payloadCaptor.capture());
            assertArrayEquals(payload, payloadCaptor.getValue());

            verifyNoInteractions(jobPublisher);
            verifyNoMoreInteractions(sessionRegistry);
        }
    }

    @Nested
    @DisplayName("Snapshot 트리거")
    class SnapshotTests {

        @Test
        @DisplayName("executeSnapshot은 JobPublisher.publishSnapshotAsync를 위임한다")
        void executeSnapshot_delegatesToPublisher() {
            UUID roomId = UUID.randomUUID();

            jobPublisher.publishSnapshotAsync(roomId);

            verify(jobPublisher).publishSnapshotAsync(eq(roomId));
            verifyNoInteractions(updateAppender);
            verifyNoInteractions(sessionRegistry);
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

            when(sessionRegistry.findAllAlivePeers(roomId, "REQ")).thenReturn(List.of());

            byte[] sync1 = sync1Frame();

            router.routeIncoming(roomId, requester, sync1);

            ArgumentCaptor<byte[]> payloadCaptor = ArgumentCaptor.forClass(byte[].class);
            verify(sessionRegistry).unicast(eq(roomId), eq(requester), payloadCaptor.capture());

            assertArrayEquals(YjsProtocolUtil.emptySync2Frame(), payloadCaptor.getValue());

            verify(sessionRegistry, never()).broadcast(any(), any(), any());
            verifyNoInteractions(updateAppender);
            verifyNoInteractions(jobPublisher);
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
            when(p2.getId()).thenReturn("P2");

            when(sessionRegistry.findAllAlivePeers(roomId, "REQ")).thenReturn(new ArrayList<>(List.of(p2, p1)));

            // ✅ 불필요 stubbing 방지: 한 줄 stubbing으로 connectedAt 값 제공
            when(sessionRegistry.getConnectedAt(any(WebSocketSession.class))).thenAnswer(inv -> {
                WebSocketSession s = inv.getArgument(0);
                if ("P1".equals(s.getId())) return 10L;
                if ("P2".equals(s.getId())) return 20L;
                return 0L;
            });

            byte[] sync1 = sync1Frame();

            when(sessionRegistry.unicast(roomId, "P1", sync1)).thenReturn(true);

            router.routeIncoming(roomId, requester, sync1);

            verify(sessionRegistry).unicast(roomId, "P1", sync1);
            verify(sessionRegistry, never()).unicast(eq(roomId), eq("P2"), any());

            verify(sessionRegistry, never()).broadcast(any(), any(), any());
            verifyNoInteractions(updateAppender);
            verifyNoInteractions(jobPublisher);
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

            when(sessionRegistry.getConnectedAt(p1)).thenReturn(10L);
            when(sessionRegistry.getConnectedAt(p2)).thenReturn(20L);

            when(sessionRegistry.findAllAlivePeers(roomId, "REQ")).thenReturn(new ArrayList<>(List.of(p1, p2)));

            byte[] sync1 = sync1Frame();

            when(sessionRegistry.unicast(eq(roomId), eq("P1"), any(byte[].class))).thenReturn(false);
            when(sessionRegistry.unicast(eq(roomId), eq("P2"), any(byte[].class))).thenReturn(true);

            router.routeIncoming(roomId, requester, sync1);

            InOrder order = inOrder(sessionRegistry);
            order.verify(sessionRegistry).unicast(eq(roomId), eq("P1"), any(byte[].class));
            order.verify(sessionRegistry).unicast(eq(roomId), eq("P2"), any(byte[].class));

            verifyNoInteractions(updateAppender);
            verifyNoInteractions(jobPublisher);
        }

        @Test
        @DisplayName("Sync2가 오면 pendingSyncs에 저장된 requester에게 그대로 포워딩한다")
        void routeIncoming_sync2_forwardsToRequester() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession requester = mock(WebSocketSession.class);
            when(requester.getId()).thenReturn("REQ");

            WebSocketSession provider = mock(WebSocketSession.class);
            when(provider.getId()).thenReturn("P1");

            when(sessionRegistry.findAllAlivePeers(roomId, "REQ")).thenReturn(new ArrayList<>(List.of(provider)));
            when(sessionRegistry.unicast(eq(roomId), eq("P1"), any(byte[].class))).thenReturn(true);

            router.routeIncoming(roomId, requester, sync1Frame());
            router.routeIncoming(roomId, provider, sync2Frame());

            ArgumentCaptor<byte[]> forwarded = ArgumentCaptor.forClass(byte[].class);
            verify(sessionRegistry).unicast(eq(roomId), eq("REQ"), forwarded.capture());
            assertArrayEquals(sync2Frame(), forwarded.getValue());

            verify(sessionRegistry, never()).broadcast(any(), any(), any());

            verifyNoInteractions(updateAppender);
            verifyNoInteractions(jobPublisher);
        }

        @Test
        @DisplayName("disconnect된 provider는 pendingSyncs에서 제거되어 sync2가 와도 포워딩되지 않는다")
        void onDisconnect_removesPendingSync_provider() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession requester = mock(WebSocketSession.class);
            when(requester.getId()).thenReturn("REQ");

            WebSocketSession provider = mock(WebSocketSession.class);
            when(provider.getId()).thenReturn("P1");

            when(sessionRegistry.findAllAlivePeers(roomId, "REQ")).thenReturn(new ArrayList<>(List.of(provider)));
            when(sessionRegistry.unicast(eq(roomId), eq("P1"), any(byte[].class))).thenReturn(true);

            router.routeIncoming(roomId, requester, sync1Frame());

            router.onDisconnect(roomId, "P1");

            router.routeIncoming(roomId, provider, sync2Frame());

            verify(sessionRegistry, never()).unicast(eq(roomId), eq("REQ"), any(byte[].class));

            verifyNoInteractions(updateAppender);
            verifyNoInteractions(jobPublisher);
        }
    }
}
