package com.yat2.episode.collaboration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.redis.JobStreamStore;
import com.yat2.episode.collaboration.yjs.YjsMessageRouter;
import com.yat2.episode.global.constant.AttributeKeys;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
    YjsMessageRouter yjsMessageRouter;

    @Mock
    JobStreamStore jobStreamStore;

    CollaborationService service;

    @BeforeEach
    void setUp() {
        service = new CollaborationService(sessionRegistry, yjsMessageRouter, jobStreamStore);
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
            verifyNoInteractions(yjsMessageRouter);
            verifyNoInteractions(jobStreamStore);
            verifyNoMoreInteractions(sessionRegistry);
        }

        @Test
        @DisplayName("해제 시 router에 disconnect를 알리고 room에서 세션을 제거한다 (remaining > 0이면 snapshot job 발행 안 함)")
        void handleDisconnect_notifiesRouterAndRemovesSession_noSnapshotWhenRemaining() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession session = mock(WebSocketSession.class);

            Map<String, Object> attrs = new HashMap<>();
            attrs.put(AttributeKeys.MINDMAP_ID, roomId);
            when(session.getAttributes()).thenReturn(attrs);
            when(session.getId()).thenReturn("S-1");

            when(sessionRegistry.removeSession(roomId, session)).thenReturn(2);
            service.handleDisconnect(session);

            InOrder order = inOrder(yjsMessageRouter, sessionRegistry);
            order.verify(yjsMessageRouter).onDisconnect(roomId, "S-1");
            order.verify(sessionRegistry).removeSession(roomId, session);

            verify(jobStreamStore, never()).publishSnapshot(any(UUID.class));
            verifyNoMoreInteractions(yjsMessageRouter, sessionRegistry);
        }

        @Test
        @DisplayName("해제 후 방에 남은 세션이 0이면 snapshot job을 발행한다")
        void handleDisconnect_whenLastSession_publishesSnapshot() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession session = mock(WebSocketSession.class);

            Map<String, Object> attrs = new HashMap<>();
            attrs.put(AttributeKeys.MINDMAP_ID, roomId);
            when(session.getAttributes()).thenReturn(attrs);
            when(session.getId()).thenReturn("S-1");

            when(sessionRegistry.removeSession(roomId, session)).thenReturn(0);

            service.handleDisconnect(session);

            InOrder order = inOrder(yjsMessageRouter, sessionRegistry, jobStreamStore);
            order.verify(yjsMessageRouter).onDisconnect(roomId, "S-1");
            order.verify(sessionRegistry).removeSession(roomId, session);
            order.verify(jobStreamStore).publishSnapshot(roomId);

            verifyNoMoreInteractions(yjsMessageRouter, sessionRegistry, jobStreamStore);
        }

        @Test
        @DisplayName("해제 시 roomId가 null이면 아무것도 하지 않는다")
        void handleDisconnect_whenRoomIdNull_doesNothing() {
            WebSocketSession session = mock(WebSocketSession.class);
            when(session.getAttributes()).thenReturn(new HashMap<>());

            assertThatCode(() -> service.handleDisconnect(session)).doesNotThrowAnyException();

            verifyNoInteractions(yjsMessageRouter);
            verifyNoInteractions(sessionRegistry);
            verifyNoInteractions(jobStreamStore);
            verify(jobStreamStore, never()).publishSnapshot(any(UUID.class));
        }
    }

    @Nested
    @DisplayName("메시지 처리")
    class MessageTests {

        @Test
        @DisplayName("roomId가 있으면 payload를 byte[]로 변환하여 router로 전달한다")
        void processMessage_routesToRouter() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession sender = mock(WebSocketSession.class);

            Map<String, Object> attrs = new HashMap<>();
            attrs.put(AttributeKeys.MINDMAP_ID, roomId);
            when(sender.getAttributes()).thenReturn(attrs);

            byte[] frame = new byte[]{ 9, 9, 9 };
            BinaryMessage message = new BinaryMessage(frame);

            service.processMessage(sender, message);

            ArgumentCaptor<byte[]> payloadCaptor = ArgumentCaptor.forClass(byte[].class);
            verify(yjsMessageRouter).routeIncoming(eq(roomId), eq(sender), payloadCaptor.capture());
            assertArrayEquals(frame, payloadCaptor.getValue());

            verifyNoInteractions(sessionRegistry);
            verifyNoInteractions(jobStreamStore);
            verifyNoMoreInteractions(yjsMessageRouter);
        }

        @Test
        @DisplayName("roomId가 null이면 router로 전달하지 않고 종료한다")
        void processMessage_whenRoomIdNull_doesNotRoute() {
            WebSocketSession sender = mock(WebSocketSession.class);
            when(sender.getAttributes()).thenReturn(new HashMap<>());

            BinaryMessage message = new BinaryMessage(new byte[]{ 1, 2, 3 });

            assertThatCode(() -> service.processMessage(sender, message)).doesNotThrowAnyException();

            verifyNoInteractions(yjsMessageRouter);
            verifyNoInteractions(sessionRegistry);
            verifyNoInteractions(jobStreamStore);
        }
    }
}
