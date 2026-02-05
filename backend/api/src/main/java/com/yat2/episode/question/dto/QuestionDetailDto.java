package com.yat2.episode.question.dto;

import com.yat2.episode.competency.dto.CompetencyTypeDto;

public record QuestionDetailDto(
        int questionId,
        CompetencyTypeDto competency,
        String question,
        String guidanceMessage
) {}
