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

import com.yat2.episode.collaboration.yjs.YjsMessageRouter;
import com.yat2.episode.global.constant.AttributeKeys;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.inOrder;
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
    YjsMessageRouter yjsMessageRouter;

    CollaborationService service;

    @BeforeEach
    void setUp() {
        service = new CollaborationService(sessionRegistry, yjsMessageRouter);
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
            verifyNoMoreInteractions(sessionRegistry);
        }

        @Test
        @DisplayName("해제 시 router에 disconnect를 알리고 room에서 세션을 제거한다")
        void handleDisconnect_notifiesRouterAndRemovesSession() {
            UUID roomId = UUID.randomUUID();
            WebSocketSession session = mock(WebSocketSession.class);

            Map<String, Object> attrs = new HashMap<>();
            attrs.put(AttributeKeys.MINDMAP_ID, roomId);
            when(session.getAttributes()).thenReturn(attrs);
            when(session.getId()).thenReturn("S-1");

            service.handleDisconnect(session);

            InOrder inOrder = inOrder(yjsMessageRouter, sessionRegistry);
            inOrder.verify(yjsMessageRouter).onDisconnect(roomId, "S-1");
            inOrder.verify(sessionRegistry).removeSession(roomId, session);

            verifyNoMoreInteractions(yjsMessageRouter, sessionRegistry);
        }

        @Test
        @DisplayName("해제 시 roomId가 null이면 아무것도 하지 않는다")
        void handleDisconnect_whenRoomIdNull_doesNothing() {
            WebSocketSession session = mock(WebSocketSession.class);

            Map<String, Object> attrs = new HashMap<>();
            when(session.getAttributes()).thenReturn(attrs);

            assertThatCode(() -> service.handleDisconnect(session)).doesNotThrowAnyException();

            verifyNoInteractions(yjsMessageRouter);
            verifyNoInteractions(sessionRegistry);
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
            verifyNoMoreInteractions(yjsMessageRouter);
        }

        @Test
        @DisplayName("roomId가 null이면 router로 전달하지 않고 종료한다")
        void processMessage_whenRoomIdNull_doesNotRoute() {
            WebSocketSession sender = mock(WebSocketSession.class);

            Map<String, Object> attrs = new HashMap<>();
            when(sender.getAttributes()).thenReturn(attrs);

            BinaryMessage message = new BinaryMessage(new byte[]{ 1, 2, 3 });

            assertThatCode(() -> service.processMessage(sender, message)).doesNotThrowAnyException();

            verifyNoInteractions(yjsMessageRouter);
            verifyNoInteractions(sessionRegistry);
        }
    }
}
