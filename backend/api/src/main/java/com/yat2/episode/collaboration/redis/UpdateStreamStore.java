package com.yat2.episode.collaboration.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.stereotype.Service;

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

        StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();

        MapRecord<String, String, byte[]> record =
                StreamRecords.newRecord().in(key).ofMap(Map.of(redisProperties.updateStream().fieldUpdate(), update));

        RecordId id = ops.add(record);

        redisBinaryTemplate.expire(key, redisProperties.updateStream().ttl());

        return id;
    }
}
