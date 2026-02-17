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

@Slf4j
@Service
@RequiredArgsConstructor
public class JobStreamStore {

    public static final String JOB_STREAM_KEY = "collab:jobs";

    private static final Duration DEDUPE_SYNC_TTL = Duration.ofSeconds(30);
    private static final Duration DEDUPE_SNAPSHOT_TTL = Duration.ofSeconds(120);

    private final StringRedisTemplate stringRedisTemplate;

    public void publishSnapshot(UUID roomId) {
        publish(JobType.SNAPSHOT, roomId, DEDUPE_SNAPSHOT_TTL);
    }

    public void publishSyncRecovery(UUID roomId) {
        publish(JobType.SYNC, roomId, DEDUPE_SYNC_TTL);
    }

    private void publish(JobType type, UUID roomId, Duration dedupeTtl) {
        if (!tryDedupe(type, roomId, dedupeTtl)) {
            return;
        }

        Map<String, String> fields = new HashMap<>();
        fields.put("t", type.name());
        fields.put("rid", roomId.toString());

        try {
            StreamOperations<String, String, String> ops = stringRedisTemplate.opsForStream();
            MapRecord<String, String, String> record = StreamRecords.newRecord().in(JOB_STREAM_KEY).ofMap(fields);
            ops.add(record);
        } catch (Exception e) {
            log.error("Failed to publish job. type={}, roomId={}", type, roomId, e);
        }
    }

    private boolean tryDedupe(JobType type, UUID roomId, Duration ttl) {
        String key = "collab:jobs:dedupe:" + type.name() + ":" + roomId;
        Boolean ok = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", ttl);
        return Boolean.TRUE.equals(ok);
    }
}
