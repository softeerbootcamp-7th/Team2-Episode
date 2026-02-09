package com.yat2.episode.episode.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.episode.Episode;

public record EpisodeDetailRes(
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
    public static EpisodeDetailRes of(Episode e) {
        return new EpisodeDetailRes(e.getId().getNodeId(), e.getMindmapId(), List.copyOf(e.getCompetencyTypeIds()),
                                    e.getContent(), e.getSituation(), e.getTask(), e.getAction(), e.getResult(),
                                    e.getStartDate(), e.getEndDate(), e.getCreatedAt(), e.getUpdatedAt());
    }
}
