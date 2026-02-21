package com.yat2.episode.episode.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

import com.yat2.episode.mindmap.constants.MindmapVisibility;

public record EpisodeSearchReq(
        UUID mindmapId,
        @NotNull(message = "mindmapType은 필수입니다.") MindmapVisibility mindmapType,
        @Size(max = 200, message = "search는 200자 이하로 입력하세요.") String search
) {}
