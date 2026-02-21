package com.yat2.episode.episode.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record EpisodeDeleteBatchReq(
        @NotEmpty List<@NotNull UUID> nodeIds
) {
    public boolean isEmpty() {
        return nodeIds.isEmpty();
    }
}
