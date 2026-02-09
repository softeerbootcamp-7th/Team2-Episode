package com.yat2.episode.episode.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record EpisodeDetailRes(
        UUID nodeId,
        UUID mindmapId,
        Integer competencyTypeId,
        String content,
        String situation,
        String task,
        String action,
        String result,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
