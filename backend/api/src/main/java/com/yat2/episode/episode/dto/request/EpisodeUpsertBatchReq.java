package com.yat2.episode.episode.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record EpisodeUpsertBatchReq(@NotEmpty List<@Valid EpisodeUpsertItemReq> items) {}
