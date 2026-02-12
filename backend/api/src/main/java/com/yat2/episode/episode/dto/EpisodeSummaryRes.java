package com.yat2.episode.episode.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.yat2.episode.episode.Episode;
import com.yat2.episode.episode.EpisodeStar;

/* 마인드맵 사이드바 STAR 정리하기 용 */
public record EpisodeSummaryRes(
        UUID nodeId,
        UUID mindmapId,
        String content,
        LocalDate startDate,
        LocalDate endDate
) {
    public static EpisodeSummaryRes of(Episode e, EpisodeStar s) {
        return new EpisodeSummaryRes(e.getId(), e.getMindmapId(), e.getContent(), s.getStartDate(), s.getEndDate());
    }

    public static EpisodeSummaryRes of(EpisodeDetail e) {
        return new EpisodeSummaryRes(e.nodeId(), e.mindmapId(), e.content(), e.startDate(), e.endDate());
    }
}
