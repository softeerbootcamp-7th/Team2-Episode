package com.yat2.episode.diagnosis.dto;

import java.time.LocalDateTime;

import com.yat2.episode.diagnosis.DiagnosisResult;

public record DiagnosisSummaryDto(
        int diagnosisId,
        String jobName,
        LocalDateTime createdAt,
        int lackCountOfCompetency
) {
    public static DiagnosisSummaryDto of(DiagnosisResult diagnosisResult, int lackCountOfCompetency) {
        return new DiagnosisSummaryDto(diagnosisResult.getId(), diagnosisResult.getJob().getName(),
                                       diagnosisResult.getCreatedAt(), lackCountOfCompetency);
    }
}
