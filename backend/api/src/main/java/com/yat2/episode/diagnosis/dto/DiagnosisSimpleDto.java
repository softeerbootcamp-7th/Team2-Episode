package com.yat2.episode.diagnosis.dto;

import java.time.LocalDateTime;

import com.yat2.episode.diagnosis.DiagnosisResult;

public record DiagnosisSimpleDto(Integer diagnosisId, String diagnosisName, LocalDateTime createdAt,
                                 int lackCountOfCompetency) {
    static final String diagnosisTemplate = " 직무 진단 결과";

    static public DiagnosisSimpleDto of(DiagnosisResult diagnosisResult, int lackCountOfCompetency) {
        return new DiagnosisSimpleDto(diagnosisResult.getId(), diagnosisResult.getJob().getName() + diagnosisTemplate,
                                      LocalDateTime.now(), lackCountOfCompetency);
    }
}
