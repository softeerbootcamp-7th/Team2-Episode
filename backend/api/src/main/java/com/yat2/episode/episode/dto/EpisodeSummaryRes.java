package com.yat2.episode.episode.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record EpisodeSummaryRes(
        UUID nodeId,
        UUID mindmapId,
        Integer competencyTypeId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
