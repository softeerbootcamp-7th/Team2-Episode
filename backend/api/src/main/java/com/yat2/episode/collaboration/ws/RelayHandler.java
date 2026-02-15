package com.yat2.episode.collaboration.ws;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import com.yat2.episode.collaboration.CollaborationService;

@Slf4j
@RequiredArgsConstructor
@Component
public class RelayHandler extends AbstractWebSocketHandler {
    private final CollaborationService collaborationService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        collaborationService.handleConnect(session);
    }

    @Override
    public void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        collaborationService.processMessage(session, message);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket 전송 에러 발생: 세션 ID = {}", session.getId(), exception);

        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) {
        collaborationService.handleDisconnect(session);
    }
}
