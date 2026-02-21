package com.yat2.episode.collaboration.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.config.RedisProperties;

@Service
@RequiredArgsConstructor
public class UpdateStreamStore {

    private final RedisTemplate<String, byte[]> redisBinaryTemplate;
    private final RedisProperties redisProperties;

    public RecordId appendUpdate(UUID roomId, byte[] update) {
        String key = redisProperties.updateStream().keyPrefix() + roomId;

        StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();

        MapRecord<String, String, byte[]> record =
                StreamRecords.newRecord().in(key).ofMap(Map.of(redisProperties.updateStream().fieldUpdate(), update));

        RecordId id = ops.add(record);

        redisBinaryTemplate.expire(key, redisProperties.updateStream().ttl());

        return id;
    }

    public List<byte[]> readAllUpdates(UUID roomId) {
        String key = redisProperties.updateStream().keyPrefix() + roomId;
        String field = redisProperties.updateStream().fieldUpdate();

        StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();

        List<MapRecord<String, String, byte[]>> records = ops.range(key, Range.unbounded());

        if (records == null || records.isEmpty()) {
            return List.of();
        }

        return records.stream().map(r -> r.getValue().get(field)).filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());
    }
}
