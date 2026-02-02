package com.yat2.episode.mindmap.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.yat2.episode.mindmap.Mindmap;

public record MindmapDataDto(
        UUID mindmapId,
        String mindmapName,
        LocalDateTime createAt,
        LocalDateTime updateAt,
        boolean isFavorite
) {
    public static MindmapDataDto of(Mindmap mindmap) {
        return new MindmapDataDto(
                mindmap.getId(),
                mindmap.getName(),
                mindmap.getCreatedAt(),
                mindmap.getUpdatedAt(),
                mindmap.isFavorite()
        );
    }
}
