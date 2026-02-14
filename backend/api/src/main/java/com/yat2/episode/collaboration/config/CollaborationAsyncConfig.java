package com.yat2.episode.collaboration.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Configuration
public class CollaborationAsyncConfig {

    @Bean(name = "redisExecutor")
    public Executor redisExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setThreadNamePrefix("redis-append-");
        exec.setCorePoolSize(1);
        exec.setMaxPoolSize(2);
        exec.setQueueCapacity(10_000);
        exec.setKeepAliveSeconds(30);
        exec.setAllowCoreThreadTimeOut(true);

        exec.setRejectedExecutionHandler(dropAndLogError());
        exec.initialize();
        return exec;
    }

    private RejectedExecutionHandler dropAndLogError() {
        AtomicLong dropped = new AtomicLong();
        AtomicLong lastLogMs = new AtomicLong(0);

        return (r, executor) -> {
            long n = dropped.incrementAndGet();

            long now = System.currentTimeMillis();
            long prev = lastLogMs.get();
            if (now - prev >= 1000 && lastLogMs.compareAndSet(prev, now)) {
                int qSize = executor.getQueue().size();
                log.error("Redis queue full. Dropping tasks. dropped={}, queueSize={}", n, qSize);
            }
        };
    }
}
