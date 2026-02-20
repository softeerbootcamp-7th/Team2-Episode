package com.yat2.episode.mindmap.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.competency.dto.CompetencyTypeRes;
import com.yat2.episode.mindmap.MindmapParticipant;

public record MindmapDetailRes(
        UUID mindmapId,
        String mindmapName,
        boolean isFavorite,
        boolean isShared,
        List<CompetencyTypeRes> competencyTypes,
        List<String> participants,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static MindmapDetailRes of(
            MindmapParticipant mindmapParticipant, List<CompetencyTypeRes> competencyTypes, List<String> participants) {
        return new MindmapDetailRes(mindmapParticipant.getMindmap().getId(), mindmapParticipant.getMindmap().getName(),
                                    mindmapParticipant.isFavorite(), mindmapParticipant.getMindmap().isShared(),
                                    competencyTypes, participants, mindmapParticipant.getMindmap().getCreatedAt(),
                                    mindmapParticipant.getMindmap().getUpdatedAt());
    }
}
