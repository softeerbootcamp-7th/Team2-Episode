package com.yat2.episode.collaboration.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.config.CollaborationRedisProperties;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobStreamStore {
    private final StringRedisTemplate stringRedisTemplate;
    private final CollaborationRedisProperties redisProps;

    public void publishSnapshot(UUID roomId) {
        publish(JobType.SNAPSHOT, roomId, redisProps.jobStream().dedupeTtl().snapshot());
    }

    public void publishSyncRecovery(UUID roomId) {
        publish(JobType.SYNC, roomId, redisProps.jobStream().dedupeTtl().sync());
    }

    private void publish(JobType type, UUID roomId, Duration dedupeTtl) {
        if (!tryDedupe(type, roomId, dedupeTtl)) {
            return;
        }

        Map<String, String> fields = new HashMap<>();
        fields.put(redisProps.jobStream().fields().type(), type.name());
        fields.put(redisProps.jobStream().fields().roomId(), roomId.toString());

        try {
            StreamOperations<String, String, String> ops = stringRedisTemplate.opsForStream();
            MapRecord<String, String, String> record =
                    StreamRecords.newRecord().in(redisProps.jobStream().key()).ofMap(fields);
            ops.add(record);
        } catch (Exception e) {
            log.error("Failed to publish job. type={}, roomId={}", type, roomId, e);
        }
    }

    private boolean tryDedupe(JobType type, UUID roomId, Duration ttl) {
        String key = redisProps.jobStream().dedupeKeyPrefix() + type.name() + ":" + roomId;
        Boolean ok = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", ttl);
        return Boolean.TRUE.equals(ok);
    }
}
