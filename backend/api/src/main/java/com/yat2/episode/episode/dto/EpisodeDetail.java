package com.yat2.episode.episode.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.episode.Episode;
import com.yat2.episode.episode.EpisodeStar;

public record EpisodeDetail(
        UUID nodeId,
        UUID mindmapId,
        List<Integer> competencyTypeIds,
        String content,
        String situation,
        String task,
        String action,
        String result,
        LocalDate startDate,
        LocalDate endDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static EpisodeDetail of(Episode e, EpisodeStar s) {
        if (s == null) {
            return new EpisodeDetail(e.getId(), e.getMindmapId(), List.of(), e.getContent(), null, null, null, null,
                                     null, null, null, null);
        }

        return new EpisodeDetail(e.getId(), e.getMindmapId(), List.copyOf(s.getCompetencyTypeIds()), e.getContent(),
                                 s.getSituation(), s.getTask(), s.getAction(), s.getResult(), s.getStartDate(),
                                 s.getEndDate(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
