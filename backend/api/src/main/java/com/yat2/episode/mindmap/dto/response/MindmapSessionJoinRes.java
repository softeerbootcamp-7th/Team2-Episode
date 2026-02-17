package com.yat2.episode.mindmap.dto.response;

public record MindmapSessionJoinRes(
        String token,
        String presignedUrl
) {}
