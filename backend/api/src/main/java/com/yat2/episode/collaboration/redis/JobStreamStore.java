package com.yat2.episode.collaboration.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.RedisStreamCommands;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.JobType;
import com.yat2.episode.collaboration.config.RedisProperties;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobStreamStore {
    private final StringRedisTemplate stringRedisTemplate;
    private final RedisProperties redisProperties;

    public void publishSnapshot(UUID roomId) {
        publishNoNeedDedupe(JobType.SNAPSHOT, roomId, redisProperties.jobStream().dedupeTtl().snapshot());
    }

    public void publishSnapshotTrigger(UUID roomId) {
        publishNeedDedupe(JobType.SNAPSHOT, roomId, redisProperties.jobStream().dedupeTtl().snapshot());
    }

    public void publishSync(UUID roomId) {
        publishNeedDedupe(JobType.SYNC, roomId, redisProperties.jobStream().dedupeTtl().sync());
    }

    public void publishNoNeedDedupe(JobType type, UUID roomId, Duration dedupeTtl) {
        publish(type, roomId, dedupeTtl, false);
    }

    public void publishNeedDedupe(JobType type, UUID roomId, Duration dedupeTtl) {
        publish(type, roomId, dedupeTtl, true);
    }

    private void publish(JobType type, UUID roomId, Duration dedupeTtl, boolean needDedupe) {
        try {
            if (needDedupe && !tryDedupe(type, roomId, dedupeTtl)) {
                return;
            }

            String streamKey = redisProperties.jobStream().key();

            Map<String, String> fields = new HashMap<>();
            fields.put(redisProperties.jobStream().fields().type(), type.name());
            fields.put(redisProperties.jobStream().fields().roomId(), roomId.toString());

            StreamOperations<String, String, String> ops = stringRedisTemplate.opsForStream();

            var maxLen = redisProperties.jobStream().maxLen();
            RedisStreamCommands.XAddOptions options =
                    RedisStreamCommands.XAddOptions.maxlen(maxLen.count()).approximateTrimming(maxLen.approximate());

            ops.add(streamKey, fields, options);

        } catch (Exception e) {
            log.error("Failed to publish job. type={}, roomId={}", type, roomId, e);
        }
    }


    private boolean tryDedupe(JobType type, UUID roomId, Duration ttl) {
        String key = redisProperties.jobStream().dedupeKeyPrefix() + type.name() + ":" + roomId;
        Boolean ok = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", ttl);
        return Boolean.TRUE.equals(ok);
    }
}
