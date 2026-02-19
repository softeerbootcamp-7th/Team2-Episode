package com.yat2.episode.episode.dto;

import java.util.List;
import java.util.UUID;

public record MindmapEpisodeRes(
        UUID mindmapId,
        String mindmapName,
        boolean isShared,
        List<EpisodeDetail> episodes
) {}
