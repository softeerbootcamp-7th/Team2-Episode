package com.yat2.episode.collaboration.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

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

        exec.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.AbortPolicy());
        exec.initialize();
        return exec;
    }
}
