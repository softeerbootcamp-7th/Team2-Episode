package com.yat2.episode.competency;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import com.yat2.episode.auth.security.Public;
import com.yat2.episode.competency.dto.CompetencyTypeRes;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.swagger.ApiErrorCodes;

@RequiredArgsConstructor
@RestController
@RequestMapping("/competency-types")
@Tag(name = "competency-type", description = "역량 조회 API")
public class CompetencyTypeController {

    private final CompetencyTypeService competencyTypeService;

    @Public
    @Operation(summary = "역량 리스트 조회")
    @ApiResponses({ @ApiResponse(responseCode = "200", description = "조회 성공") })
    @ApiErrorCodes(ErrorCode.INTERNAL_ERROR)
    @GetMapping
    public ResponseEntity<List<CompetencyTypeRes>> getAllCompetencies() {
        return ResponseEntity.ok(competencyTypeService.getAllData());
    }
}
