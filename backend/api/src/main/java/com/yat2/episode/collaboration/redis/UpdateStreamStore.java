package com.yat2.episode.collaboration.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.RedisStreamCommands;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.config.CollaborationRedisProperties;

@Service
@RequiredArgsConstructor
public class UpdateStreamStore {

    private final RedisTemplate<String, byte[]> redisBinaryTemplate;
    private final CollaborationRedisProperties redisProperties;

    public RecordId appendUpdate(UUID roomId, byte[] update) {
        String key = redisProperties.updateStream().keyPrefix() + roomId;

        var maxLen = redisProperties.updateStream().maxLen();
        String field = redisProperties.updateStream().fieldUpdate();

        StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();

        RedisStreamCommands.XAddOptions options =
                RedisStreamCommands.XAddOptions.maxlen(maxLen.count()).approximateTrimming(maxLen.approximate());

        RecordId id = ops.add(key, Map.of(field, update), options);

        redisBinaryTemplate.expire(key, redisProperties.updateStream().ttl());
        return id;
    }

    public long length(UUID roomId) {
        String key = redisProperties.updateStream().keyPrefix() + roomId;
        Long len = redisBinaryTemplate.opsForStream().size(key);
        return len == null ? 0 : len;
    }

    private static byte[] raw(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }
}
