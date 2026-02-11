package com.yat2.episode.episode.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record EpisodeUpdateContentReq(
        @Size(max = 100) String content,
        LocalDateTime localDateTime
) {}
