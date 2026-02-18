package com.yat2.episode.collaboration.worker;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

import com.yat2.episode.collaboration.config.CollaborationAsyncProperties;
import com.yat2.episode.collaboration.redis.UpdateStreamStore;

@Slf4j
@Component
public class UpdateAppender {
    private final UpdateStreamStore updateStreamStore;
    private final JobPublisher jobPublisher;
    private final Executor updateExecutor;
    private final int maxRetries;

    public UpdateAppender(
            UpdateStreamStore updateStreamStore, JobPublisher jobPublisher,
            @Qualifier("updateExecutor") Executor updateExecutor, CollaborationAsyncProperties asyncProperties
    ) {
        this.updateExecutor = updateExecutor;
        this.updateStreamStore = updateStreamStore;
        this.jobPublisher = jobPublisher;
        this.maxRetries = Math.max(1, asyncProperties.updateAppendMaxRetries());
    }

    public void appendUpdateAsync(UUID roomId, byte[] payload) {
        try {
            updateExecutor.execute(() -> tryAppend(roomId, payload));
        } catch (RejectedExecutionException e) {
            jobPublisher.publishSyncAsync(roomId);
        } catch (Exception e) {
            log.error("updateExecutor scheduling failed unexpectedly. roomId={}", roomId, e);
            jobPublisher.publishSyncAsync(roomId);
        }
    }

    private void tryAppend(UUID roomId, byte[] payload) {
        for (int i = 0; i < maxRetries; i++) {
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
