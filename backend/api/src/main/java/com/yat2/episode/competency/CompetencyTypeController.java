package com.yat2.episode.competency;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.auth.security.Public;
import com.yat2.episode.competency.dto.CompetencyTypeRes;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.swagger.ApiErrorCodes;
import com.yat2.episode.global.swagger.AuthRequiredErrors;
import com.yat2.episode.mindmap.MindmapAccessValidator;

import static com.yat2.episode.global.constant.RequestAttrs.USER_ID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/competency-types")
@Tag(name = "competency-type", description = "역량 조회 API")
public class CompetencyTypeController {

    private final CompetencyTypeService competencyTypeService;
    private final MindmapAccessValidator mindmapAccessValidator;

    @Public
    @Operation(summary = "역량 리스트 조회")
    @ApiResponses({ @ApiResponse(responseCode = "200", description = "조회 성공") })
    @ApiErrorCodes(ErrorCode.INTERNAL_ERROR)
    @GetMapping
    public ResponseEntity<List<CompetencyTypeRes>> getAllCompetencies() {
        return ResponseEntity.ok(competencyTypeService.getAllData());
    }

    @Operation(summary = "특정 마인드맵 내 역량 리스트 조회")
    @ApiResponses({ @ApiResponse(responseCode = "200", description = "조회 성공") })
    @AuthRequiredErrors
    @ApiErrorCodes({ ErrorCode.INVALID_REQUEST, ErrorCode.INTERNAL_ERROR, ErrorCode.MINDMAP_NOT_FOUND })
    @GetMapping("/mindmaps/{mindmapId}")
    public List<Integer> getCompetenciesInMindmap(
            @RequestAttribute(USER_ID) long userId,
            @PathVariable UUID mindmapId
    ) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);
        return competencyTypeService.getCompetencyTypesInMindmap(mindmapId);
    }

}
