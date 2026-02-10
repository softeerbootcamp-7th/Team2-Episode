package com.yat2.episode.question.dto;

import com.yat2.episode.competency.dto.CompetencyTypeRes;
import com.yat2.episode.question.Question;

public record QuestionDetailDto(
        int questionId,
        CompetencyTypeRes competency,
        String question,
        String guidanceMessage
) {
    public static QuestionDetailDto of(Question question) {
        return new QuestionDetailDto(question.getId(), CompetencyTypeRes.of(question.getCompetencyType()),
                                     question.getContent(), question.getGuidanceMessage());
    }
}
