package com.yat2.episode.diagnosis.dto;

import java.time.LocalDateTime;

import com.yat2.episode.diagnosis.DiagnosisResult;

public record DiagnosisSummaryRes(
        int diagnosisId,
        String jobName,
        LocalDateTime createdAt,
        int weaknessCount
) {
    public DiagnosisSummaryRes(int diagnosisId, String jobName, LocalDateTime createdAt, Long weaknessCount) {
        this(diagnosisId, jobName, createdAt, weaknessCount.intValue());
    }

    public static DiagnosisSummaryRes of(DiagnosisResult diagnosisResult, int weaknessCount) {
        return new DiagnosisSummaryRes(diagnosisResult.getId(), diagnosisResult.getJob().getName(),
                                       diagnosisResult.getCreatedAt(), weaknessCount);
    }
}
