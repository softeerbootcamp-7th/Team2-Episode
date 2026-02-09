package com.yat2.episode.episode.dto;

public record EpisodeUpsertReq(
        Integer competencyTypeId,
        String content,
        String situation,
        String task,
        String action,
        String result
) {}
