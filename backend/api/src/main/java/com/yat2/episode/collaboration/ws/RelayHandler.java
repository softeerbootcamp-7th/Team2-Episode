package com.yat2.episode.collaboration.ws;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import com.yat2.episode.collaboration.CollaborationService;

@RequiredArgsConstructor
@Component
public class RelayHandler extends AbstractWebSocketHandler {
    private final CollaborationService collaborationService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        //TODO
    }

    @Override
    public void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        //TODO
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) {
        //TODO
    }
}
