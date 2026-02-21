package com.yat2.episode.collaboration.config;


import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "collaboration.worker")
public record CollaborationWorkerProperties(
        SnapshotTrigger snapshotTrigger
) {
    public record SnapshotTrigger(
            int sampleEvery,
            long triggerThreshold
    ) {}
}
