package com.yat2.episode.mindmap.dto;

import java.util.UUID;

import com.yat2.episode.mindmap.Mindmap;

public record MindmapNameRes(
        UUID mindmapId,
        String mindmapName
) {
    public static MindmapNameRes of(Mindmap mindmap) {
        return new MindmapNameRes(mindmap.getId(), mindmap.getName());
    }
}
