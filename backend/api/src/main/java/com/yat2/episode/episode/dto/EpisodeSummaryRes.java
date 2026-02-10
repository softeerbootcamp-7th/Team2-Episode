package com.yat2.episode.episode.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.yat2.episode.episode.Episode;

/* 마인드맵 사이드바 STAR 정리하기 용 */
public record EpisodeSummaryRes(
        UUID nodeId,
        UUID mindmapId,
        String content,
        LocalDate startDate,
        LocalDate endDate
) {
    public static EpisodeSummaryRes of(Episode e) {
        return new EpisodeSummaryRes(e.getId().getNodeId(), e.getMindmapId(), e.getContent(), e.getStartDate(),
                                     e.getEndDate());
    }
}
