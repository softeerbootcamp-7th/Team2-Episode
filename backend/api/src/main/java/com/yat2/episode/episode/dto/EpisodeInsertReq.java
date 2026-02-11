package com.yat2.episode.episode.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.Set;

public record EpisodeInsertReq(
        Set<@Positive Integer> competencyTypeIds,
        @Size(max = 100) String content,
        @Size(max = 200) String situation,
        @Size(max = 200) String task,
        @Size(max = 200) String action,
        @Size(max = 200) String result,
        LocalDate startDate,
        LocalDate endDate
) {}
