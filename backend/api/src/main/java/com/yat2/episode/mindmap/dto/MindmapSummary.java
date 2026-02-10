package com.yat2.episode.mindmap.dto;

import java.util.UUID;

import com.yat2.episode.mindmap.Mindmap;
import com.yat2.episode.mindmap.MindmapParticipant;

public record MindmapSummary(
        UUID mindmapId,
        String mindmapName,
        Boolean isFavorite
) {
    public static MindmapSummary of(Mindmap mindmap) {
        return new MindmapSummary(mindmap.getId(), mindmap.getName(), null);
    }

    public static MindmapSummary of(MindmapParticipant mindmapParticipant) {
        return new MindmapSummary(mindmapParticipant.getMindmap().getId(), mindmapParticipant.getMindmap().getName(),
                                  mindmapParticipant.isFavorite());
    }
}
