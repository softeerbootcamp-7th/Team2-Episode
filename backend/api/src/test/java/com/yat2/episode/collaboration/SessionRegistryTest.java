package com.yat2.episode.collaboration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.config.WebSocketProperties;

import static com.yat2.episode.global.constant.AttributeKeys.CONNECTED_AT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
        @DisplayName("세션 ID 기준으로 제거한다 (남은 세션 수를 반환)")
        void removeSession_removesById_andReturnsRemaining() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession s1 = mock(WebSocketSession.class);
            when(s1.getId()).thenReturn("s1");
            when(s1.isOpen()).thenReturn(true);
            when(s1.getAttributes()).thenReturn(new HashMap<>());

            registry.addSession(roomId, s1);

            int remaining = registry.removeSession(roomId, s1);

            assertThat(remaining).isEqualTo(0);
            assertThat(registry.findAllAlivePeers(roomId, "NONE")).isEmpty();
        }

        @Test
        @DisplayName("세션을 여러 개 등록 후 하나 제거하면 remaining이 감소한다")
        void removeSession_multiple_sessions_remainingDecreases() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession s1 = mock(WebSocketSession.class);
            when(s1.getId()).thenReturn("s1");
            when(s1.isOpen()).thenReturn(true);
            when(s1.getAttributes()).thenReturn(new HashMap<>());

            WebSocketSession s2 = mock(WebSocketSession.class);
            when(s2.getId()).thenReturn("s2");
            when(s2.isOpen()).thenReturn(true);
            when(s2.getAttributes()).thenReturn(new HashMap<>());

            registry.addSession(roomId, s1);
            registry.addSession(roomId, s2);

            int remaining = registry.removeSession(roomId, s1);

            assertThat(remaining).isEqualTo(1);
            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(1).extracting(WebSocketSession::getId)
                    .containsExactly("s2");
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

            byte[] payload = new byte[]{ 1, 2, 3, 4 };

            registry.broadcast(roomId, sender, payload);

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
        @DisplayName("전송 중 예외가 발생한 세션은 제거한다")
        void broadcast_removesSessionsThatThrowOnSend() throws Exception {
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

            registry.broadcast(roomId, sender, new byte[]{ 1, 2 });

            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(1).extracting(WebSocketSession::getId)
                    .containsExactly("sender");
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
        @DisplayName("sendMessage가 예외면 제거하고 false")
        void unicast_whenSendThrows_removedAndFalse() throws Exception {
            UUID roomId = UUID.randomUUID();

            WebSocketSession receiver = mock(WebSocketSession.class);
            when(receiver.getId()).thenReturn("r1");
            when(receiver.isOpen()).thenReturn(true);
            when(receiver.getAttributes()).thenReturn(new HashMap<>());
            doThrow(new IOException("boom")).when(receiver).sendMessage(any(BinaryMessage.class));

            registry.addSession(roomId, receiver);

            boolean ok = registry.unicast(roomId, "r1", new byte[]{ 1 });

            assertThat(ok).isFalse();
            assertThat(registry.findAllAlivePeers(roomId, "NONE")).isEmpty();
        }
    }
}
