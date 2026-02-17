package com.yat2.episode.collaboration.config;


import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.yat2.episode.collaboration.ws.HandshakeInterceptor;
import com.yat2.episode.collaboration.ws.RelayHandler;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {
    private final RelayHandler relayHandler;
    private final HandshakeInterceptor handshakeInterceptor;

    public static final String WS_PATH_PREFIX = "/ws/mindmap";


    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(relayHandler, WS_PATH_PREFIX + "/{mindmapId}").addInterceptors(handshakeInterceptor)
                .setAllowedOriginPatterns("http://localhost:*", "https://episode.io.kr");
    }
}
