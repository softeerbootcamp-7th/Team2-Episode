package com.yat2.episode.question;

import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.swagger.ApiErrorCodes;
import com.yat2.episode.global.swagger.AuthRequiredErrors;
import com.yat2.episode.question.dto.QuestionsByCompetencyCategoryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.yat2.episode.global.constant.RequestAttrs.USER_ID;

@RequiredArgsConstructor
@RestController
@AuthRequiredErrors
@RequestMapping("/question")
@Tag(name = "Question", description = "역량 자가 진단용 문항 관련 API")
public class QuestionController {
    private final QuestionService questionService;

    @GetMapping()
    @Operation(summary = "세부 역량 별 문항 조회", description = "세부 역량 별 문항을 하나 씩 뽑아 목록으로 제공합니다.")
    @ApiResponses({@ApiResponse(responseCode = "200", description = "조회 성공")})
    @ApiErrorCodes({ErrorCode.INTERNAL_ERROR, ErrorCode.USER_NOT_FOUND, ErrorCode.JOB_NOT_SELECTED})
    public ResponseEntity<List<QuestionsByCompetencyCategoryDto>> getQuestionSet(
            @RequestAttribute(USER_ID) long userId
    ) {

        return ResponseEntity.ok(questionService.getQuestionSetByUserId(userId));
    }
}
