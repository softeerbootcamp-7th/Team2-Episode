package com.yat2.episode.episode.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EpisodeUpsertContentReq(
        @Size(max = 100) @NotNull String content
) {}
