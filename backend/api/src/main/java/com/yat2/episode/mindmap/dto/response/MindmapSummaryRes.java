package com.yat2.episode.mindmap.dto.response;

import java.util.UUID;

import com.yat2.episode.mindmap.Mindmap;
import com.yat2.episode.mindmap.MindmapParticipant;

public record MindmapSummaryRes(
        UUID mindmapId,
        String mindmapName,
        Boolean isFavorite
) {
    public static MindmapSummaryRes of(Mindmap mindmap) {
        return new MindmapSummaryRes(mindmap.getId(), mindmap.getName(), null);
    }

    public static MindmapSummaryRes of(MindmapParticipant mindmapParticipant) {
        return new MindmapSummaryRes(mindmapParticipant.getMindmap().getId(), mindmapParticipant.getMindmap().getName(),
                                     mindmapParticipant.isFavorite());
    }
}
