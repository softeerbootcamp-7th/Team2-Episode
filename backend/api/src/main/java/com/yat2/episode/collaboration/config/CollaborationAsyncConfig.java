package com.yat2.episode.collaboration.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@RequiredArgsConstructor
@Configuration
public class CollaborationAsyncConfig {

    private static final String THREAD_PREFIX = "redis-append-";

    private final CollaborationAsyncProperties asyncProperties;

    @Bean(name = "redisExecutor")
    public Executor redisExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setThreadNamePrefix(THREAD_PREFIX);
        exec.setCorePoolSize(asyncProperties.corePoolSize());
        exec.setMaxPoolSize(asyncProperties.maxPoolSize());
        exec.setQueueCapacity(asyncProperties.queueCapacity());
        exec.setKeepAliveSeconds(asyncProperties.keepAliveSeconds());
        exec.setAllowCoreThreadTimeOut(asyncProperties.allowCoreThreadTimeout());

        exec.setRejectedExecutionHandler(dropAndLogError());
        exec.initialize();
        return exec;
    }


    private RejectedExecutionHandler dropAndLogError() {
        AtomicLong dropped = new AtomicLong();
        AtomicLong lastLogMs = new AtomicLong(0);
        long logIntervalMs = asyncProperties.dropLogIntervalMs();
        //TODO: Update가 drop 될 경우 Yjs Runner에게 알려 Sync 프로토콜로 복구
        return (r, executor) -> {
            long n = dropped.incrementAndGet();
            long now = System.currentTimeMillis();
            long prev = lastLogMs.get();

            if (now - prev >= logIntervalMs && lastLogMs.compareAndSet(prev, now)) {
                int qSize = executor.getQueue().size();
                log.error("Redis queue full. Dropping tasks. dropped={}, queueSize={}", n, qSize);
            }
        };
    }
}
