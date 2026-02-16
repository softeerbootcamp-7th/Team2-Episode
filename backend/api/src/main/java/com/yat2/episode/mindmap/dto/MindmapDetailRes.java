package com.yat2.episode.mindmap.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.mindmap.MindmapParticipant;

public record MindmapDetailRes(
        UUID mindmapId,
        String mindmapName,
        boolean isFavorite,
        boolean isShared,
        List<Integer> competencyTypeIds,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static MindmapDetailRes of(MindmapParticipant mindmapParticipant, List<Integer> competencyTypeIds) {
        return new MindmapDetailRes(mindmapParticipant.getMindmap().getId(), mindmapParticipant.getMindmap().getName(),
                                    mindmapParticipant.isFavorite(), mindmapParticipant.getMindmap().isShared(),
                                    competencyTypeIds, mindmapParticipant.getMindmap().getCreatedAt(),
                                    mindmapParticipant.getMindmap().getUpdatedAt());
    }
}
