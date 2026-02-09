package com.yat2.episode.episode.dto;

import java.time.LocalDate;
import java.util.List;

public record EpisodeUpsertReq(
        List<Integer> competencyTypeIds,
        String content,
        String situation,
        String task,
        String action,
        String result,
        LocalDate startDate,
        LocalDate endDate
) {}
