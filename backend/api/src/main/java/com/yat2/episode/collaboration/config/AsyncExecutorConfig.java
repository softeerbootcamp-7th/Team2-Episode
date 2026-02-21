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
public class AsyncExecutorConfig {

    private static final String THREAD_PREFIX_UPDATE = "redis-append-";
    private static final String THREAD_PREFIX_SYNC = "sync-job-";

    private final AsyncExecutorProperties asyncExecutorProperties;

    @Bean(name = "updateExecutor")
    public Executor updateExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setThreadNamePrefix(THREAD_PREFIX_UPDATE);
        exec.setCorePoolSize(asyncExecutorProperties.corePoolSize());
        exec.setMaxPoolSize(asyncExecutorProperties.maxPoolSize());
        exec.setQueueCapacity(asyncExecutorProperties.queueCapacity());
        exec.setKeepAliveSeconds(asyncExecutorProperties.keepAliveSeconds());
        exec.setAllowCoreThreadTimeOut(asyncExecutorProperties.allowCoreThreadTimeout());

        exec.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.AbortPolicy());
        exec.initialize();
        return exec;
    }

    @Bean(name = "jobExecutor")
    public Executor jobExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setThreadNamePrefix(THREAD_PREFIX_SYNC);

        exec.setCorePoolSize(asyncExecutorProperties.corePoolSize());
        exec.setMaxPoolSize(asyncExecutorProperties.maxPoolSize());

        exec.setQueueCapacity(asyncExecutorProperties.queueCapacity());
        exec.setKeepAliveSeconds(asyncExecutorProperties.keepAliveSeconds());
        exec.setAllowCoreThreadTimeOut(true);

        exec.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());

        exec.initialize();
        return exec;
    }

}
