package com.yat2.episode.job.dto;

import com.yat2.episode.job.Job;

public record JobSummary(
        Integer id,
        String name
) {
    public static JobSummary of(Job job) {
        return new JobSummary(job.getId(), job.getName());
    }
}
