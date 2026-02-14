package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RedisStreamStore {

    private final RedisTemplate<String, byte[]> redisBinaryTemplate;

    private static final String FIELD_UPDATE = "u";

    private String streamKey(UUID roomId) {
        return "collab:room:" + roomId;
    }

    public RecordId appendUpdate(UUID roomId, byte[] update) {
        String key = streamKey(roomId);

        StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();

        MapRecord<String, String, byte[]> record =
                StreamRecords.newRecord().in(key).ofMap(Map.of(FIELD_UPDATE, update));

        RecordId id = ops.add(record);

        redisBinaryTemplate.expire(key, Duration.ofDays(2));

        return id;
    }
}
