package com.yat2.episode.mindmap.dto;

public record MindmapCreateReq(
        boolean isShared,
        String title
) {}
