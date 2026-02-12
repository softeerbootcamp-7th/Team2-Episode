package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

@Slf4j
@RequiredArgsConstructor
@Component
public class RelayHandler extends AbstractWebSocketHandler {
    private final MessageService messageService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        messageService.handleConnect(session);
    }

    @Override
    public void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        messageService.processMessage(session, message);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket 전송 에러 발생: 세션 ID = {}, 원인 = {}",
                session.getId(), exception.getMessage());

        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) {
        messageService.handleDisconnect(session);
    }
}
