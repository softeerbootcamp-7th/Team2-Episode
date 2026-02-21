package com.yat2.episode.episode.dto.response;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetail;

public record MindmapEpisodeRes(
        UUID mindmapId,
        String mindmapName,
        boolean isShared,
        List<EpisodeDetail> episodes
) {}
