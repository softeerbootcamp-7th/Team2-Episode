package com.yat2.episode.diagnosis.dto;

import java.util.Set;

public record DiagnosisCreateReq(
        Set<Integer> unansweredQuestionIds,
        Integer jobId
) {}
