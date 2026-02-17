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
    private final WebSocketProperties webSocketProperties;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(relayHandler, webSocketProperties.pathPrefix() + "/{mindmapId}")
                .addInterceptors(handshakeInterceptor)
                .setAllowedOriginPatterns(String.valueOf(webSocketProperties.allowedOriginPatterns()));
    }
}
