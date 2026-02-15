package com.yat2.episode.mindmap.dto;

public record MindmapSessionJoinRes(
        String token,
        String presignedUrl
) {}
