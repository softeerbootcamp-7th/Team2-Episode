package com.yat2.episode.collaboration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.UUID;

import com.yat2.episode.collaboration.config.WebSocketProperties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.argThat;
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
        @DisplayName("세션을 등록한다")
        void addSession_addsSession() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession s1 = mock(WebSocketSession.class);
            when(s1.getId()).thenReturn("s1");
            when(s1.isOpen()).thenReturn(true);

            registry.addSession(roomId, s1);

            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(1).extracting(WebSocketSession::getId)
                    .containsExactly("s1");
        }

        @Test
        @DisplayName("세션 ID 기준으로 제거한다")
        void removeSession_removesById() {
            UUID roomId = UUID.randomUUID();

            WebSocketSession s1 = mock(WebSocketSession.class);
            when(s1.getId()).thenReturn("s1");
            when(s1.isOpen()).thenReturn(true);

            registry.addSession(roomId, s1);
            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(1);

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

            WebSocketSession r1 = mock(WebSocketSession.class);
            when(r1.getId()).thenReturn("r1");
            when(r1.isOpen()).thenReturn(true);

            registry.addSession(roomId, sender);
            registry.addSession(roomId, r1);

            byte[] payload = new byte[]{ 1, 2, 3, 4 };

            registry.broadcast(roomId, sender, payload);

            verify(sender, never()).sendMessage(any(BinaryMessage.class));

            verify(r1, times(1)).sendMessage(argThat((WebSocketMessage<?> msg) -> {
                if (!(msg instanceof BinaryMessage bm)) return false;

                ByteBuffer bb = bm.getPayload().duplicate();
                byte[] got = new byte[bb.remaining()];
                bb.get(got);

                return java.util.Arrays.equals(got, payload);
            }));
        }

        @Test
        @DisplayName("닫힌 세션은 제거한다")
        void broadcast_removesClosedSessions() throws IOException {
            UUID roomId = UUID.randomUUID();

            WebSocketSession sender = mock(WebSocketSession.class);
            when(sender.getId()).thenReturn("sender");
            when(sender.isOpen()).thenReturn(true);

            WebSocketSession closed = mock(WebSocketSession.class);
            when(closed.getId()).thenReturn("closed");
            when(closed.isOpen()).thenReturn(false, true);

            registry.addSession(roomId, sender);
            registry.addSession(roomId, closed);

            registry.broadcast(roomId, sender, new byte[]{ 9 });
            registry.broadcast(roomId, sender, new byte[]{ 9 });

            verify(closed, never()).sendMessage(any(BinaryMessage.class));

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

            WebSocketSession bad = mock(WebSocketSession.class);
            when(bad.getId()).thenReturn("bad");
            when(bad.isOpen()).thenReturn(true);
            doThrow(new IOException("boom")).doNothing().when(bad).sendMessage(any(BinaryMessage.class));

            registry.addSession(roomId, sender);
            registry.addSession(roomId, bad);

            registry.broadcast(roomId, sender, new byte[]{ 1, 2 });
            registry.broadcast(roomId, sender, new byte[]{ 1, 2 });

            verify(bad, times(1)).sendMessage(any(BinaryMessage.class));

            assertThat(registry.findAllAlivePeers(roomId, "NONE")).hasSize(1).extracting(WebSocketSession::getId)
                    .containsExactly("sender");
        }
    }
}
