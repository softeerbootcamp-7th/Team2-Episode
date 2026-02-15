package com.yat2.episode.mindmap.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.yat2.episode.mindmap.MindmapParticipant;

public record MindmapDetailRes(
        UUID mindmapId,
        String mindmapName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean isFavorite
) {
    public static MindmapDetailRes of(MindmapParticipant mindmapParticipant) {
        return new MindmapDetailRes(mindmapParticipant.getMindmap().getId(), mindmapParticipant.getMindmap().getName(),
                                    mindmapParticipant.getMindmap().getCreatedAt(),
                                    mindmapParticipant.getMindmap().getUpdatedAt(), mindmapParticipant.isFavorite());
    }
}
