package com.yat2.episode.episode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.request.EpisodeDeleteBatchReq;
import com.yat2.episode.episode.dto.request.EpisodeSearchReq;
import com.yat2.episode.episode.dto.request.StarUpdateReq;
import com.yat2.episode.episode.dto.response.MindmapEpisodeRes;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.swagger.ApiErrorCodes;
import com.yat2.episode.global.swagger.AuthRequiredErrors;

import static com.yat2.episode.global.constant.AttributeKeys.USER_ID;

@RestController
@AuthRequiredErrors
@RequiredArgsConstructor
@RequestMapping("/episodes")
@Tag(name = "Episode", description = "에피소드 STAR 관련 API")
public class EpisodeController {

    private final EpisodeService episodeService;

    @Operation(summary = "에피소드 정보 조회", description = "에피소드 세부 정보를 조회합니다.")
    @ApiErrorCodes({ ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR })
    @GetMapping("/{nodeId}")
    public EpisodeDetail getEpisodeDetail(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        return episodeService.getEpisodeDetail(nodeId, userId);
    }

    @Operation(
            summary = "에피소드 부분 수정", description = "에피소드를 수정합니다. Body의 모든 필드는 Optional 입니다. " +
                                                  "String은 빈 문자열, 배열은 빈 배열, Date는 별도 API로 삭제가 가능합니다."
    )
    @ApiErrorCodes(
            { ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR,
              ErrorCode.EPISODE_STAR_NOT_FOUND }
    )
    @PatchMapping("/{nodeId}/stars")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateStar(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId,
            @Valid
            @RequestBody
            StarUpdateReq req
    ) {
        episodeService.updateStar(nodeId, userId, req);
    }

    @Operation(summary = "에피소드 삭제", description = "에피소드를 삭제합니다.")
    @ApiErrorCodes(
            { ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR,
              ErrorCode.MINDMAP_NOT_FOUND }
    )
    @DeleteMapping("/{nodeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEpisode(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        episodeService.deleteEpisode(nodeId, userId);
    }


    @Operation(summary = "에피소드 삭제 bulk 처리", description = "에피소드 목록을 삭제합니다.")
    @ApiErrorCodes(
            { ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.INTERNAL_ERROR,
              ErrorCode.MINDMAP_NOT_FOUND }
    )
    @DeleteMapping("/batch")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEpisodeList(
            @RequestAttribute(USER_ID) long userId,
            @Valid
            @RequestBody
            EpisodeDeleteBatchReq req
    ) {
        //episodeService.deleteEpisode(nodeId, userId);
    }

    @Operation(summary = "에피소드 STAR 비우기", description = "에피소드 내의 STAR/태그 등의 내용을 비웁니다.")
    @ApiErrorCodes(
            { ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.EPISODE_STAR_NOT_FOUND,
              ErrorCode.INTERNAL_ERROR, ErrorCode.MINDMAP_NOT_FOUND }
    )
    @PutMapping("/{nodeId}/stars/clear")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearStar(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        episodeService.clearStar(nodeId, userId);
    }

    @Operation(summary = "에피소드 시작/끝 날짜 삭제", description = "에피소드의 시작/끝 날짜를 초기화합니다.")
    @ApiErrorCodes(
            { ErrorCode.INVALID_REQUEST, ErrorCode.EPISODE_NOT_FOUND, ErrorCode.MINDMAP_NOT_FOUND,
              ErrorCode.INTERNAL_ERROR }
    )
    @DeleteMapping("/{nodeId}/dates")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearEpisodeDates(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        episodeService.clearEpisodeDates(nodeId, userId);
    }


    @Operation(summary = "마인드맵 및 에피소드 목록 검색")
    @ApiResponses({ @ApiResponse(responseCode = "200", description = "조회 성공") })
    @AuthRequiredErrors
    @ApiErrorCodes(
            { ErrorCode.INVALID_REQUEST, ErrorCode.INTERNAL_ERROR, ErrorCode.MINDMAP_NOT_FOUND,
              ErrorCode.MINDMAP_PARTICIPANT_NOT_FOUND }
    )
    @GetMapping()
    public List<MindmapEpisodeRes> getEpisodeListSearch(
            @RequestAttribute(USER_ID) long userId,
            @Valid EpisodeSearchReq req
    ) {
        return episodeService.searchEpisodes(userId, req);
    }
}
