package com.yat2.episode.collaboration.worker;


import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.Executor;

import com.yat2.episode.collaboration.JobType;
import com.yat2.episode.collaboration.redis.JobStreamStore;

@Slf4j
@Component
public class JobPublisher {
    private final JobStreamStore jobStreamStore;
    private final Executor jobExecutor;

    public JobPublisher(
            JobStreamStore jobStreamStore,
            @Qualifier("jobExecutor") Executor jobExecutor
    ) {
        this.jobStreamStore = jobStreamStore;
        this.jobExecutor = jobExecutor;
    }

    public void publishSyncAsync(UUID roomId) {
        executeSafely(() -> jobStreamStore.publishSync(roomId), JobType.SYNC.name(), roomId);
    }

    public void publishSnapshotAsync(UUID roomId) {
        executeSafely(() -> jobStreamStore.publishSnapshot(roomId), JobType.SNAPSHOT.name(), roomId);
    }

    private void executeSafely(Runnable task, String type, UUID roomId) {
        try {
            jobExecutor.execute(task);
        } catch (Exception e) {
            log.warn("jobExecutor rejected. running inline. type={}, roomId={}", type, roomId, e);
            try {
                task.run();
            } catch (Exception ex) {
                log.error("Job publish failed. type={}, roomId={}", type, roomId, ex);
            }
        }
    }
}
