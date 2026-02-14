package com.yat2.episode.collaboration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.Set;
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

    @SuppressWarnings("unchecked")
    private Map<UUID, Set<WebSocketSession>> rooms() {
        return (Map<UUID, Set<WebSocketSession>>) ReflectionTestUtils.getField(registry, "rooms");
    }

    @Test
    void addSession_addsDecoratedSession() {
        UUID roomId = UUID.randomUUID();

        WebSocketSession s1 = mock(WebSocketSession.class);
        when(s1.getId()).thenReturn("s1");
        when(s1.isOpen()).thenReturn(true);

        registry.addSession(roomId, s1);

        assertThat(rooms().get(roomId)).hasSize(1);
    }

    @Test
    void removeSession_removesById() {
        UUID roomId = UUID.randomUUID();

        WebSocketSession s1 = mock(WebSocketSession.class);
        when(s1.getId()).thenReturn("s1");
        when(s1.isOpen()).thenReturn(true);

        registry.addSession(roomId, s1);
        assertThat(rooms().get(roomId)).hasSize(1);

        registry.removeSession(roomId, s1);
        assertThat(rooms().get(roomId)).isNull();
    }

    @Test
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
    void broadcast_removesClosedSessions() {
        UUID roomId = UUID.randomUUID();

        WebSocketSession sender = mock(WebSocketSession.class);
        when(sender.getId()).thenReturn("sender");
        when(sender.isOpen()).thenReturn(true);

        WebSocketSession closed = mock(WebSocketSession.class);
        when(closed.getId()).thenReturn("closed");
        when(closed.isOpen()).thenReturn(false);

        registry.addSession(roomId, sender);
        registry.addSession(roomId, closed);

        registry.broadcast(roomId, sender, new byte[]{ 9 });

        assertThat(rooms().get(roomId)).hasSize(1);
        assertThat(rooms().get(roomId).stream().map(WebSocketSession::getId)).containsExactly("sender");
    }

    @Test
    void broadcast_removesSessionsThatThrowOnSend() throws Exception {
        UUID roomId = UUID.randomUUID();

        WebSocketSession sender = mock(WebSocketSession.class);
        when(sender.getId()).thenReturn("sender");
        when(sender.isOpen()).thenReturn(true);

        WebSocketSession bad = mock(WebSocketSession.class);
        when(bad.getId()).thenReturn("bad");
        when(bad.isOpen()).thenReturn(true);
        doThrow(new IOException("boom")).when(bad).sendMessage(any(BinaryMessage.class));

        registry.addSession(roomId, sender);
        registry.addSession(roomId, bad);

        registry.broadcast(roomId, sender, new byte[]{ 1, 2 });

        assertThat(rooms().get(roomId)).hasSize(1);
        assertThat(rooms().get(roomId).stream().map(WebSocketSession::getId)).containsExactly("sender");
    }
}
