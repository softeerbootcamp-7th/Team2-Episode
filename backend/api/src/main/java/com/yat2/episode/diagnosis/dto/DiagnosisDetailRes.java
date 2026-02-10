package com.yat2.episode.diagnosis.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.yat2.episode.question.dto.QuestionDetailDto;

public record DiagnosisDetailRes(
        int diagnosisId,
        String jobName,
        LocalDateTime createdAt,
        List<QuestionDetailDto> weaknesses
) {}
