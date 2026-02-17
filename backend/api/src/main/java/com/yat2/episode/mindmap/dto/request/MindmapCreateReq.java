package com.yat2.episode.mindmap.dto.request;

public record MindmapCreateReq(
        boolean isShared,
        String title
) {}
