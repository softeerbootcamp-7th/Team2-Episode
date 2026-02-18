package com.yat2.episode.collaboration.worker;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.Executor;

import com.yat2.episode.collaboration.redis.UpdateStreamStore;

@Slf4j
@Component
@RequiredArgsConstructor
public class UpdateAppender {
    private final UpdateStreamStore updateStreamStore;
    private final JobPublisher jobPublisher;

    @Qualifier("redisExecutor")
    private final Executor redisExecutor;

    public void appendUpdateAsync(UUID roomId, byte[] payload) {
        try {
            redisExecutor.execute(() -> tryAppend(roomId, payload));
        } catch (Exception e) {
            jobPublisher.publishSyncAsync(roomId);
        }
    }

    private void tryAppend(UUID roomId, byte[] payload) {
        for (int i = 0; i < 5; i++) {
            try {
                updateStreamStore.appendUpdate(roomId, payload);
                return;
            } catch (Exception e) {
                if (isFatalRedisWrite(e)) {
                    log.error("Fatal redis write. roomId={}", roomId, e);
                    // todo: 다른 방법 도모..?
                    // 저희가 같은 redis 인스턴스 내에서 job 처리를 하고 있어서, fatal error 시에는 sync 시도가 무의미하다고 판단됩니다.
                    return;
                }
                log.warn("Redis append failed (retryable). roomId={}, attempt={}", roomId, i + 1, e);
            }
        }
        jobPublisher.publishSyncAsync(roomId);
    }

    private boolean isFatalRedisWrite(Exception exception) {
        String msg = getRootMessage(exception);
        return msg.contains("OOM command not allowed") || msg.contains("MISCONF") || msg.contains("READONLY") ||
               msg.contains("NOPERM");
    }

    private String getRootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null) t = t.getCause();
        return t.getMessage() == null ? "" : t.getMessage();
    }
}
