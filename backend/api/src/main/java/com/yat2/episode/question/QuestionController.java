package com.yat2.episode.question;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import com.yat2.episode.auth.security.Public;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.global.swagger.ApiErrorCodes;
import com.yat2.episode.question.dto.QuestionsByCompetencyCategoryRes;

@RequiredArgsConstructor
@RestController
@Public
@RequestMapping("/questions")
@Tag(name = "Question", description = "역량 자가 진단용 문항 관련 API")
public class QuestionController {
    private final QuestionService questionService;

    @GetMapping()
    @Operation(summary = "세부 역량 별 문항 조회", description = "세부 역량 별 문항을 하나 씩 뽑아 목록으로 제공합니다.")
    @ApiErrorCodes({ ErrorCode.INTERNAL_ERROR })
    public List<QuestionsByCompetencyCategoryRes> getQuestionSet(
            @RequestParam
            @Positive
            @NotNull
            Integer jobId
    ) {
        return questionService.getQuestionSetByJobId(jobId);
    }
}
