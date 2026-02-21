package com.yat2.episode.episode.dto.request;

import jakarta.validation.Valid;

import java.util.List;

public record EpisodeUpsertBatchReq(List<@Valid EpisodeUpsertItemReq> items) {
    public EpisodeUpsertBatchReq(List<@Valid EpisodeUpsertItemReq> items) {
        this.items = items;
    }
}
