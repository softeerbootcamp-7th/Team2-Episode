package com.yat2.episode.collaboration;

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
    private final CollaborationRedisProperties redisProps;

    public RecordId appendUpdate(UUID roomId, byte[] update) {
        String key = redisProps.updateStream().keyPrefix() + roomId;

        StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();

        MapRecord<String, String, byte[]> record =
                StreamRecords.newRecord().in(key).ofMap(Map.of(redisProps.updateStream().fieldUpdate(), update));

        RecordId id = ops.add(record);

        redisBinaryTemplate.expire(key, redisProps.updateStream().ttl());

        return id;
    }
}
