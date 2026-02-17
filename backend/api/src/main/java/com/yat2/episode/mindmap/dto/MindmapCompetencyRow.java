package com.yat2.episode.mindmap.dto;

import java.util.UUID;

public record MindmapCompetencyRow(
        UUID mindmapId,
        Integer competencyTypeId
) {}
