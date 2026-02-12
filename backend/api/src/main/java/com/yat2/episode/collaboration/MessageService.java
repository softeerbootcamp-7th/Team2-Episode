package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

@RequiredArgsConstructor
@Service
public class MessageService {
    private final SessionRegistry sessionRegistry;
    private final RedisStreamRepository redisStreamRepository;

    public void handleConnect(WebSocketSession session) {
        //TODO
    }

    public void processMessage(WebSocketSession sender, BinaryMessage message) {
        //TODO
    }

    public void handleDisconnect(WebSocketSession session) {
        //TODO
    }
}
