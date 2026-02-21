package com.yat2.episode.episode.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record EpisodeUpsertItemReq(
        @NotNull UUID nodeId,
        @Size(max = 200) @NotNull String content
) {}
