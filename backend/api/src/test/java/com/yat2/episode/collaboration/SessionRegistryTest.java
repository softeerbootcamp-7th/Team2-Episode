package com.yat2.episode.collaboration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.config.WebSocketProperties;

import static com.yat2.episode.global.constant.AttributeKeys.CONNECTED_AT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("SessionRegistry 단위 테스트")
class SessionRegistryTest {

    SessionRegistry registry;
    WebSocketProperties wsProperties;

    @BeforeEach
    void setUp() {
        wsProperties = mock(WebSocketProperties.class);
        when(wsProperties.sendTimeout()).thenReturn(1000);
        when(wsProperties.bufferSize()).thenReturn(1024 * 1024);
        registry = new SessionRegistry(wsProperties);
    }

    @Nested
    @DisplayName("세션 등록/제거")
    class SessionManagementTests {
        @Test
        @DisplayName("세션을 등록하면 ConcurrentWebSocketSessionDecorator로 저장된다")
        void addSession_storesDecoratedSession() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession s1 = mock(WebSocketSession.class);
            when(s1.getId()).thenReturn("s1");
            when(s1.isOpen()).thenReturn(true);

            Map<String, Object> attrs = new HashMap<>();
            when(s1.getAttributes()).thenReturn(attrs);

            registry.addSession(roomId, s1);

            List<WebSocketSession> peers = registry.findAllAlivePeers(roomId, "NONE");
            assertThat(peers).hasSize(1);
            assertThat(peers.get(0)).isInstanceOf(ConcurrentWebSocketSessionDecorator.class);
        }

        @Test
        @DisplayName("세션을 등록한다 (alive peers에 포함되고 CONNECTED_AT이 설정된다)")
        void addSession_addsSession_andSetsConnectedAt() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession s1 = mock(WebSocketSession.class);
            when(s1.getId()).thenReturn("s1");
            when(s1.isOpen()).thenReturn(true);

            Map<String, Object> attrs = new HashMap<>();
            when(s1.getAttributes()).thenReturn(attrs);

            registry.addSession(roomId, s1);

            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(1).extracting(WebSocketSession::getId)
                    .containsExactly("s1");

            assertThat(attrs).containsKey(CONNECTED_AT);
            assertThat(attrs.get(CONNECTED_AT)).isInstanceOf(Long.class);
        }

        @Test
        @DisplayName("세션 ID 기준으로 제거한다")
        void removeSession_removesById() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession s1 = mock(WebSocketSession.class);
            when(s1.getId()).thenReturn("s1");
            when(s1.isOpen()).thenReturn(true);
            when(s1.getAttributes()).thenReturn(new HashMap<>());

            registry.addSession(roomId, s1);

            registry.removeSession(roomId, s1);

            assertThat(registry.findAllAlivePeers(roomId, "NONE")).isEmpty();
        }
    }

    @Nested
    @DisplayName("브로드캐스트")
    class BroadcastTests {

        @Test
        @DisplayName("발신자를 제외한 세션에게 전송한다")
        void broadcast_sendsToOthersButNotSender() throws Exception {
            UUID roomId = UUID.randomUUID();

            WebSocketSession sender = mock(WebSocketSession.class);
            when(sender.getId()).thenReturn("sender");
            when(sender.isOpen()).thenReturn(true);
            when(sender.getAttributes()).thenReturn(new HashMap<>());

            WebSocketSession r1 = mock(WebSocketSession.class);
            when(r1.getId()).thenReturn("r1");
            when(r1.isOpen()).thenReturn(true);
            when(r1.getAttributes()).thenReturn(new HashMap<>());

            registry.addSession(roomId, sender);
            registry.addSession(roomId, r1);

            registry.broadcast(roomId, sender, new byte[]{ 1, 2, 3 });

            verify(sender, never()).sendMessage(any(BinaryMessage.class));
            verify(r1).sendMessage(any(BinaryMessage.class));
        }

        @Test
        @DisplayName("닫힌 세션은 제거한다")
        void broadcast_removesClosedSessions() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession sender = mock(WebSocketSession.class);
            when(sender.getId()).thenReturn("sender");
            when(sender.isOpen()).thenReturn(true);
            when(sender.getAttributes()).thenReturn(new HashMap<>());

            WebSocketSession closed = mock(WebSocketSession.class);
            when(closed.getId()).thenReturn("closed");
            when(closed.isOpen()).thenReturn(false);
            when(closed.getAttributes()).thenReturn(new HashMap<>());

            registry.addSession(roomId, sender);
            registry.addSession(roomId, closed);

            registry.broadcast(roomId, sender, new byte[]{ 9 });

            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(1).extracting(WebSocketSession::getId)
                    .containsExactly("sender");
        }

        @Test
        @DisplayName("전송 중 예외가 발생해도 세션은 제거하지 않는다")
        void broadcast_sendThrows_notRemoved() throws Exception {
            UUID roomId = UUID.randomUUID();

            WebSocketSession sender = mock(WebSocketSession.class);
            when(sender.getId()).thenReturn("sender");
            when(sender.isOpen()).thenReturn(true);
            when(sender.getAttributes()).thenReturn(new HashMap<>());

            WebSocketSession bad = mock(WebSocketSession.class);
            when(bad.getId()).thenReturn("bad");
            when(bad.isOpen()).thenReturn(true);
            when(bad.getAttributes()).thenReturn(new HashMap<>());

            doThrow(new IOException("boom")).when(bad).sendMessage(any(BinaryMessage.class));

            registry.addSession(roomId, sender);
            registry.addSession(roomId, bad);

            registry.broadcast(roomId, sender, new byte[]{ 1 });

            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(2);
        }
    }

    @Nested
    @DisplayName("유니캐스트")
    class UnicastTests {

        @Test
        @DisplayName("receiver가 없으면 false")
        void unicast_whenNoReceiver_false() {
            UUID roomId = UUID.randomUUID();
            boolean ok = registry.unicast(roomId, "missing", new byte[]{ 1 });
            assertThat(ok).isFalse();
        }

        @Test
        @DisplayName("닫힌 receiver면 제거하고 false")
        void unicast_whenClosedReceiver_removedAndFalse() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession receiver = mock(WebSocketSession.class);
            when(receiver.getId()).thenReturn("r1");
            when(receiver.isOpen()).thenReturn(false);
            when(receiver.getAttributes()).thenReturn(new HashMap<>());

            registry.addSession(roomId, receiver);

            boolean ok = registry.unicast(roomId, "r1", new byte[]{ 1 });

            assertThat(ok).isFalse();
            assertThat(registry.findAllAlivePeers(roomId, "NONE")).isEmpty();
        }

        @Test
        @DisplayName("sendMessage가 예외면 제거하지 않고 false만 반환")
        void unicast_whenSendThrows_notRemoved() throws Exception {
            UUID roomId = UUID.randomUUID();

            WebSocketSession receiver = mock(WebSocketSession.class);
            when(receiver.getId()).thenReturn("r1");
            when(receiver.isOpen()).thenReturn(true);
            when(receiver.getAttributes()).thenReturn(new HashMap<>());
            doThrow(new IOException("boom")).when(receiver).sendMessage(any(BinaryMessage.class));

            registry.addSession(roomId, receiver);

            boolean ok = registry.unicast(roomId, "r1", new byte[]{ 1 });

            assertThat(ok).isFalse();
            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(1);
        }

        @Test
        @DisplayName("unicastAll은 payloads가 null/empty면 true를 반환한다")
        void unicastAll_whenNullOrEmpty_returnsTrue() {
            UUID roomId = UUID.randomUUID();

            assertThat(registry.unicastAll(roomId, "missing", null)).isTrue();
            assertThat(registry.unicastAll(roomId, "missing", List.of())).isTrue();
        }

        @Test
        @DisplayName("unicastAll은 payloads 개수만큼 전송하고 null payload는 skip한다")
        void unicastAll_sendsEachPayload_skipsNull() throws Exception {
            UUID roomId = UUID.randomUUID();

            WebSocketSession receiver = mock(WebSocketSession.class);
            when(receiver.getId()).thenReturn("r1");
            when(receiver.isOpen()).thenReturn(true);
            when(receiver.getAttributes()).thenReturn(new HashMap<>());

            registry.addSession(roomId, receiver);

            List<byte[]> payloads = new ArrayList<>();
            payloads.add(new byte[]{ 1 });
            payloads.add(null);
            payloads.add(new byte[]{ 2 });

            boolean ok = registry.unicastAll(roomId, "r1", payloads);

            assertThat(ok).isTrue();
            verify(receiver, times(2)).sendMessage(any(BinaryMessage.class));
        }
    }
}
