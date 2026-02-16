package com.yat2.episode.collaboration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
import java.util.concurrent.Executor;

import com.yat2.episode.global.constant.AttributeKeys;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CollaborationService 단위 테스트")
class CollaborationServiceTest {

    @Mock
    SessionRegistry sessionRegistry;

    @Mock
    RedisStreamStore redisStreamStore;

    @Mock
    Executor redisExecutor;

    CollaborationService service;

    @BeforeEach
    void setUp() {
        service = new CollaborationService(sessionRegistry, redisStreamStore, redisExecutor);
    }

    @Nested
    @DisplayName("세션 연결/해제")
    class ConnectionTests {

        @Test
        @DisplayName("연결 시 room에 세션을 등록한다")
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
        @DisplayName("해제 시 room에서 세션을 제거한다")
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
    }

    @Nested
    @DisplayName("메시지 처리")
    class MessageTests {

        @Test
        @DisplayName("항상 브로드캐스트한다")
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
        @DisplayName("Update 프레임이면 Redis에 저장한다 (Executor에 task를 넣고, task 실행 시 append된다)")
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

            ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);
            verify(redisExecutor).execute(taskCaptor.capture());

            taskCaptor.getValue().run();

            ArgumentCaptor<byte[]> redisCaptor = ArgumentCaptor.forClass(byte[].class);
            verify(redisStreamStore).appendUpdate(eq(roomId), redisCaptor.capture());
            assertArrayEquals(frame, redisCaptor.getValue());
        }

        @Test
        @DisplayName("Update 프레임이 아니면 Redis에 저장하지 않는다")
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
            verifyNoInteractions(redisExecutor);
            verifyNoInteractions(redisStreamStore);
        }

        @Test
        @DisplayName("Redis 저장 중 예외가 발생해도 처리 흐름이 죽지 않는다")
        void processMessage_whenRedisThrows_doesNotCrash() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession sender = mock(WebSocketSession.class);

            Map<String, Object> attrs = new HashMap<>();
            attrs.put(AttributeKeys.MINDMAP_ID, roomId);
            when(sender.getAttributes()).thenReturn(attrs);

            byte[] frame = new byte[]{ 0, 2, 1, 2, 3 };
            BinaryMessage message = new BinaryMessage(frame);

            doThrow(new RuntimeException("redis down")).when(redisStreamStore)
                    .appendUpdate(eq(roomId), any(byte[].class));

            assertThatCode(() -> service.processMessage(sender, message)).doesNotThrowAnyException();

            verify(sessionRegistry).broadcast(eq(roomId), eq(sender), any(byte[].class));

            ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);
            verify(redisExecutor).execute(taskCaptor.capture());

            assertThatCode(() -> taskCaptor.getValue().run()).doesNotThrowAnyException();

            verify(redisStreamStore).appendUpdate(eq(roomId), any(byte[].class));
        }
    }
}
