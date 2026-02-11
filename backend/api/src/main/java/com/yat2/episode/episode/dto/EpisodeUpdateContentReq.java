package com.yat2.episode.episode.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EpisodeUpdateContentReq(
        @Size(max = 100) @NotNull String content
) {}
