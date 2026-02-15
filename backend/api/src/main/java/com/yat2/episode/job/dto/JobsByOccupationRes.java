package com.yat2.episode.job.dto;

import java.util.List;

public record JobsByOccupationRes(
        Integer occupationId,
        String occupationName,
        List<JobSummary> jobs
) {}
