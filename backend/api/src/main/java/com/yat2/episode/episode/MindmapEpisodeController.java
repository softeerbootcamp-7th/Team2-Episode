package com.yat2.episode.episode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.EpisodeSummaryRes;
import com.yat2.episode.episode.dto.EpisodeUpsertContentReq;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.swagger.ApiErrorCodes;
import com.yat2.episode.global.swagger.AuthRequiredErrors;

import static com.yat2.episode.global.constant.RequestAttrs.USER_ID;

@RestController
@AuthRequiredErrors
@RequiredArgsConstructor
@RequestMapping("/mindmaps/{mindmapId}/episodes")
@Tag(name = "Episode", description = "에피소드 STAR 관련 API")
public class MindmapEpisodeController {

    private final EpisodeService episodeService;

    @Operation(
            summary = "마인드맵 내 에피소드 리스트 조회", description = "마인드맵 내 에피소드 리스트를 조회합니다. 마인드맵 사이드바의 \"STAR 정리하기\"에서 사용됩니다."
    )
    @ApiErrorCodes(
            { ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR,
              ErrorCode.MINDMAP_NOT_FOUND }
    )
    @GetMapping
    public List<EpisodeSummaryRes> getMindmapEpisodes(
            @PathVariable UUID mindmapId,
            @RequestAttribute(USER_ID) long userId
    ) {
        return episodeService.getMindmapEpisodes(mindmapId, userId);
    }

    @Operation(
            summary = "마인드맵 내 에피소드 생성",
            description = "마인드맵 내에 에피소드를 생성합니다. 클라이언트에서 ID를 생성해서 요청합니다. Body의 모든 필드는 Optional입니다. 빈 객체도 허용됩니다."
    )
    @ApiErrorCodes(
            { ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR,
              ErrorCode.MINDMAP_NOT_FOUND }
    )
    @PutMapping("/{nodeId}")
    public EpisodeDetail createEpisode(
            @PathVariable UUID mindmapId,
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId,
            @Valid
            @RequestBody
            EpisodeUpsertContentReq episodeUpsertReq
    ) {
        return episodeService.upsertEpisode(nodeId, userId, mindmapId, episodeUpsertReq);
    }
}
