package com.yat2.episode.collaboration.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.collaboration.config.RedisProperties;

@Component
@RequiredArgsConstructor
public class LastEntryIdStore {

    private final RedisTemplate<String, String> redisTemplate;
    private final RedisProperties redisProperties;

    private String getKey(UUID roomId) {
        return redisProperties.updateStream().keyPrefix() + roomId + redisProperties.lastEntryIdStore().keySuffix();
    }

    public Optional<String> get(UUID roomId) {
        String key = getKey(roomId);
        return Optional.ofNullable(redisTemplate.opsForValue().get(key));
    }
}
