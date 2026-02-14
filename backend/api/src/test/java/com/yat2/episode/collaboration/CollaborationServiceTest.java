package com.yat2.episode.collaboration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.global.constant.AttributeKeys;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CollaborationServiceTest {

    @Mock
    SessionRegistry sessionRegistry;

    @Mock
    RedisStreamStore redisStreamStore;

    CollaborationService service;

    @BeforeEach
    void setUp() {
        service = new CollaborationService(sessionRegistry, redisStreamStore);
    }

    @Test
    void handleConnect_addsSessionToRoom() {
        UUID roomId = UUID.randomUUID();
        WebSocketSession session = mock(WebSocketSession.class);

        Map<String, Object> attrs = new HashMap<>();
        attrs.put(AttributeKeys.MINDMAP_ID, roomId);
        when(session.getAttributes()).thenReturn(attrs);

        service.handleConnect(session);

        verify(sessionRegistry).addSession(roomId, session);
        verifyNoMoreInteractions(sessionRegistry);
    }

    @Test
    void handleDisconnect_removesSessionFromRoom() {
        UUID roomId = UUID.randomUUID();
        WebSocketSession session = mock(WebSocketSession.class);

        Map<String, Object> attrs = new HashMap<>();
        attrs.put(AttributeKeys.MINDMAP_ID, roomId);
        when(session.getAttributes()).thenReturn(attrs);

        service.handleDisconnect(session);

        verify(sessionRegistry).removeSession(roomId, session);
        verifyNoMoreInteractions(sessionRegistry);
    }

    @Test
    void processMessage_alwaysBroadcasts() {
        UUID roomId = UUID.randomUUID();
        WebSocketSession sender = mock(WebSocketSession.class);

        Map<String, Object> attrs = new HashMap<>();
        attrs.put(AttributeKeys.MINDMAP_ID, roomId);
        when(sender.getAttributes()).thenReturn(attrs);

        byte[] frame = new byte[]{ 9, 9, 9 };
        BinaryMessage message = new BinaryMessage(frame);

        service.processMessage(sender, message);

        ArgumentCaptor<byte[]> payloadCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(sessionRegistry).broadcast(eq(roomId), eq(sender), payloadCaptor.capture());

        assertArrayEquals(frame, payloadCaptor.getValue());
        verifyNoMoreInteractions(sessionRegistry);
    }

    @Test
    void processMessage_whenUpdateFrame_appendsToRedis() {
        UUID roomId = UUID.randomUUID();
        WebSocketSession sender = mock(WebSocketSession.class);

        Map<String, Object> attrs = new HashMap<>();
        attrs.put(AttributeKeys.MINDMAP_ID, roomId);
        when(sender.getAttributes()).thenReturn(attrs);

        byte[] frame = new byte[]{ 0, 2, 1, 2, 3, 4 };
        BinaryMessage message = new BinaryMessage(frame);

        service.processMessage(sender, message);

        ArgumentCaptor<byte[]> broadcastCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(sessionRegistry).broadcast(eq(roomId), eq(sender), broadcastCaptor.capture());
        assertArrayEquals(frame, broadcastCaptor.getValue());

        ArgumentCaptor<byte[]> redisCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(redisStreamStore).appendUpdate(eq(roomId), redisCaptor.capture());

        assertArrayEquals(frame, redisCaptor.getValue());
    }

    @Test
    void processMessage_whenNotUpdateFrame_doesNotAppendToRedis() {
        UUID roomId = UUID.randomUUID();
        WebSocketSession sender = mock(WebSocketSession.class);

        Map<String, Object> attrs = new HashMap<>();
        attrs.put(AttributeKeys.MINDMAP_ID, roomId);
        when(sender.getAttributes()).thenReturn(attrs);

        byte[] frame = new byte[]{ 0, 1, 9, 9 };
        BinaryMessage message = new BinaryMessage(frame);

        service.processMessage(sender, message);

        verify(sessionRegistry).broadcast(eq(roomId), eq(sender), any(byte[].class));
        verifyNoInteractions(redisStreamStore);
    }

    @Test
    void processMessage_whenRedisThrows_doesNotCrash() {
        UUID roomId = UUID.randomUUID();
        WebSocketSession sender = mock(WebSocketSession.class);

        Map<String, Object> attrs = new HashMap<>();
        attrs.put(AttributeKeys.MINDMAP_ID, roomId);
        when(sender.getAttributes()).thenReturn(attrs);

        byte[] frame = new byte[]{ 0, 2, 1, 2, 3 };
        BinaryMessage message = new BinaryMessage(frame);

        doThrow(new RuntimeException("redis down")).when(redisStreamStore).appendUpdate(eq(roomId), any(byte[].class));

        assertThatCode(() -> service.processMessage(sender, message)).doesNotThrowAnyException();

        verify(sessionRegistry).broadcast(eq(roomId), eq(sender), any(byte[].class));
        verify(redisStreamStore).appendUpdate(eq(roomId), any(byte[].class));
    }
}
