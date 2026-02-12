package com.yat2.episode.mindmap;

import com.github.f4b6a3.uuid.UuidCreator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.swagger.ApiErrorCodes;
import com.yat2.episode.global.swagger.AuthRequiredErrors;
import com.yat2.episode.global.utils.UriUtil;
import com.yat2.episode.mindmap.dto.MindmapCreateReq;
import com.yat2.episode.mindmap.dto.MindmapDetailRes;
import com.yat2.episode.mindmap.dto.MindmapNameRes;
import com.yat2.episode.mindmap.dto.MindmapNameUpdateReq;
import com.yat2.episode.mindmap.dto.MindmapSessionJoinRes;
import com.yat2.episode.mindmap.dto.MindmapSummaryRes;
import com.yat2.episode.mindmap.dto.MindmapUploadUrlRes;
import com.yat2.episode.mindmap.s3.dto.S3UploadFieldsRes;

import static com.yat2.episode.global.constant.RequestAttrs.USER_ID;


@RequiredArgsConstructor
@RestController
@AuthRequiredErrors
@RequestMapping("/mindmaps")
@Tag(name = "Mindmap", description = "마인드맵 관리 API")
public class MindmapController {
    private final MindmapService mindmapService;

    @Operation(
            summary = "마인드맵 목록 조회 (통합)", description = """
            로그인한 사용자의 마인드맵 목록을 조회합니다.
            Query Parameter를 통해 전체(ALL), 비공개(PRIVATE), 공개/팀(PUBLIC)을 필터링합니다.
            파라미터가 없으면 기본값은 ALL입니다.
            """
    )
    @ApiErrorCodes({ ErrorCode.INTERNAL_ERROR, ErrorCode.USER_NOT_FOUND })
    @GetMapping
    public List<MindmapDetailRes> getMindmaps(
            @RequestAttribute(USER_ID) long userId,
            @Parameter(description = "조회할 마인드맵 유형 (ALL, PRIVATE, PUBLIC)")
            @RequestParam(name = "type", required = false, defaultValue = "ALL")
            MindmapVisibility type
    ) {
        return mindmapService.getMindmaps(userId, type);
    }

    @Operation(
            summary = "마인드맵 조회", description = """
            입력된 마인드맵의 UUID를 기반으로 마인드맵 데이터를 조회합니다.
            """
    )
    @ApiErrorCodes({ ErrorCode.INTERNAL_ERROR, ErrorCode.USER_NOT_FOUND, ErrorCode.MINDMAP_NOT_FOUND })
    @GetMapping("/{mindmapId}")
    public MindmapDetailRes getMindmap(
            @RequestAttribute(USER_ID) long userId,
            @PathVariable UUID mindmapId
    ) {
        return mindmapService.getMindmapById(userId, mindmapId);
    }

    @Operation(
            summary = "내 마인드맵 이름 목록 조회", description = """
            로그인한 사용자가 참여 중인 마인드맵의 식별 정보(아이디, 이름) 목록을 조회합니다.
            마인드맵 선택 드롭다운, 사이드바 등에 사용됩니다.
            """
    )
    @ApiErrorCodes({ ErrorCode.INTERNAL_ERROR, ErrorCode.USER_NOT_FOUND })
    @GetMapping("/titles")
    public List<MindmapNameRes> getMyMindmapNames(
            @RequestAttribute(USER_ID) long userId
    ) {
        return mindmapService.getMindmapList(userId);
    }

    @Operation(
            summary = "내 마인드맵 생성", description = """
            마인드맵을 생성합니다.
            팀 마인드맵 생성 시에는 중심 노드가 되는 프로젝트 명이 default 마인드맵 명이 됩니다. 입력이 필수입니다.
            개인 마인드맵 생성 시에는 사용자 명을 기반으로 생성된 이름이 default 마인드맵 명이 됩니다.
             입력 값이 있으면 해당 이름으로 생성됩니다. (프론트에서의 api 호출 유연성을 위함.)
            웹 소켓 연결은 별도 요청이 필요합니다.
            """
    )
    @ApiResponses({ @ApiResponse(responseCode = "201", description = "마인드맵 생성 성공") })
    @ApiErrorCodes(
            { ErrorCode.INTERNAL_ERROR, ErrorCode.USER_NOT_FOUND, ErrorCode.S3_URL_FAIL,
              ErrorCode.MINDMAP_TITLE_REQUIRED }
    )
    @PostMapping()
    public ResponseEntity<MindmapUploadUrlRes> createMindmap(
            @RequestAttribute(USER_ID) long userId,
            @RequestBody MindmapCreateReq reqBody
    ) {
        UUID uuid = UuidCreator.getTimeOrderedEpoch();
        S3UploadFieldsRes presignedData = mindmapService.getUploadInfo(uuid);
        MindmapSummaryRes mindmapData = mindmapService.saveMindmapAndParticipant(userId, reqBody, uuid);
        MindmapUploadUrlRes resBody = new MindmapUploadUrlRes(mindmapData, presignedData);
        URI location = UriUtil.createLocationUri(resBody.mindmap().mindmapId());
        return ResponseEntity.created(location).body(resBody);
    }

    @Operation(
            summary = "마인드맵 공동 편집 참여", description = """
            팀 마인드맵의 공동 편집 참여 전 인증 및 사용자 참여 정보를 생성합니다.
            응답으로는 wss 최초 연결 시 필요한 토큰 데이터와 스냅샷용 presigned url을 제공합니다.
            """
    )
    @ApiErrorCodes(
            { ErrorCode.USER_NOT_FOUND, ErrorCode.INTERNAL_ERROR, ErrorCode.MINDMAP_NOT_FOUND,
              ErrorCode.MINDMAP_ACCESS_FORBIDDEN }
    )
    @PostMapping("/{mindmapId}/sessions/join")
    public MindmapSessionJoinRes joinMindmapSession(
            @RequestAttribute(USER_ID) long userId,
            @PathVariable UUID mindmapId
    ) {
        return mindmapService.joinMindmapSession(userId, mindmapId);
    }

    @Operation(
            summary = "마인드맵 삭제", description = """
            마인드맵을 삭제합니다.
            팀 마인드맵/개인 마인드맵 참여 목록에서 사용자를 삭제합니다.
            다른 참여자가 존재하는 경우, 마인드맵 자체 데이터는 유지되어
            다른 참여자에게 영향이 가지 않습니다.
            """
    )
    @ApiResponses({ @ApiResponse(responseCode = "204", description = "삭제 성공", content = @Content) })
    @ApiErrorCodes({ ErrorCode.USER_NOT_FOUND, ErrorCode.INTERNAL_ERROR, ErrorCode.MINDMAP_NOT_FOUND })
    @DeleteMapping("/{mindmapId}")
    public ResponseEntity<?> deleteMindmap(
            @RequestAttribute(USER_ID) long userId,
            @PathVariable UUID mindmapId
    ) {
        mindmapService.deleteMindmap(userId, mindmapId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "마인드맵 즐겨찾기 상태 변경", description = "마인드맵의 즐겨찾기 여부를 설정하거나 해제합니다.")
    @ApiErrorCodes({ ErrorCode.USER_NOT_FOUND, ErrorCode.INTERNAL_ERROR, ErrorCode.MINDMAP_NOT_FOUND })
    @PatchMapping("/{mindmapId}/favorite")
    public MindmapDetailRes updateFavoriteStatus(
            @RequestAttribute(USER_ID) long userId,
            @PathVariable UUID mindmapId,
            @RequestParam boolean status
    ) {
        return mindmapService.updateFavoriteStatus(userId, mindmapId, status);
    }

    @Operation(summary = "마인드맵 이름 변경", description = "마인드맵의 이름을 변경합니다. 팀 마인드맵 또한 모든 사용자에게 반영되는 수정 사항입니다.")
    @ApiErrorCodes({ ErrorCode.USER_NOT_FOUND, ErrorCode.INTERNAL_ERROR, ErrorCode.MINDMAP_NOT_FOUND })
    @PatchMapping("/{mindmapId}/name")
    public MindmapDetailRes updateName(
            @RequestAttribute(USER_ID) long userId,
            @PathVariable UUID mindmapId,
            @Valid
            @RequestBody
            MindmapNameUpdateReq request
    ) {
        return mindmapService.updateName(userId, mindmapId, request.name());
    }


    @Operation(summary = "마인드맵 참여자 저장", description = "팀 마인드맵에 대한 참여자로 저장됩니다. 사용자의 마인드맵 리스트에 해당 마인드맵이 추가됩니다.")
    @ApiErrorCodes(
            { ErrorCode.USER_NOT_FOUND, ErrorCode.INTERNAL_ERROR, ErrorCode.MINDMAP_NOT_FOUND,
              ErrorCode.MINDMAP_ACCESS_FORBIDDEN }
    )
    @PostMapping("/{mindmapId}/participants")
    public MindmapDetailRes addParticipant(
            @RequestAttribute(USER_ID) long userId,
            @PathVariable UUID mindmapId
    ) {
        return mindmapService.saveMindmapParticipant(userId, mindmapId);
    }

    public enum MindmapVisibility {
        ALL, PRIVATE, PUBLIC
    }
}
