package com.yat2.episode.episode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetailRes;
import com.yat2.episode.episode.dto.EpisodeUpdateContentReq;
import com.yat2.episode.episode.dto.EpisodeUpsertReq;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.swagger.ApiErrorCodes;
import com.yat2.episode.global.swagger.AuthRequiredErrors;

import static com.yat2.episode.global.constant.RequestAttrs.USER_ID;

@RestController
@AuthRequiredErrors
@RequiredArgsConstructor
@RequestMapping("/episodes/{nodeId}")
@Tag(name = "Episode", description = "에피소드 STAR 관련 API")
public class EpisodeController {

    private final EpisodeService episodeService;

    @Operation(summary = "에피소드 정보 조회", description = "에피소드 세부 정보를 조회합니다.")
    @ApiErrorCodes({ ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR })
    @GetMapping
    public EpisodeDetailRes getEpisode(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        return episodeService.getEpisode(nodeId, userId);
    }

    @Operation(
            summary = "에피소드 부분 수정", description = "에피소드를 수정합니다. Body의 모든 필드는 Optional 입니다. " +
                                                  "String은 빈 문자열, 배열은 빈 배열, Date는 별도 API로 삭제가 가능합니다."
    )
    @ApiErrorCodes({ ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR })
    @PatchMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateEpisode(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId,
            @Valid
            @RequestBody
            EpisodeUpsertReq req
    ) {
        episodeService.updateEpisode(nodeId, userId, req);
    }

    @Operation(
            summary = "에피소드 제목 수정",
            description = "에피소드의 node명(=content)을 수정합니다. " + "한 노드에 대한 수정 api 요청이 다수 들어왔을 때, 더 최근의 요청을 기준으로 반영이 됩니다."
    )
    @ApiErrorCodes({ ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR })
    @PatchMapping("/content")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateEpisodeContent(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId,
            @Valid
            @RequestBody
            EpisodeUpdateContentReq req
    ) {
        episodeService.updateContentEpisode(nodeId, userId, req);
    }

    @Operation(summary = "에피소드 삭제", description = "에피소드를 삭제합니다.")
    @ApiErrorCodes({ ErrorCode.INVALID_REQUEST, ErrorCode.INTERNAL_ERROR })
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEpisode(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        episodeService.deleteEpisode(nodeId, userId);
    }

    @Operation(summary = "에피소드 시작/끝 날짜 삭제", description = "에피소드의 시작/끝 날짜를 초기화합니다.")
    @ApiErrorCodes({ ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR })
    @DeleteMapping("/dates")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearEpisodeDates(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        episodeService.clearEpisodeDates(nodeId, userId);
    }
}
