package com.yat2.episode.question.dto;

import com.yat2.episode.competency.dto.CompetencyTypeRes;
import com.yat2.episode.question.Question;

public record QuestionDetail(
        int questionId,
        CompetencyTypeRes competency,
        String question,
        String guidanceMessage
) {
    public static QuestionDetail of(Question question) {
        return new QuestionDetail(question.getId(), CompetencyTypeRes.of(question.getCompetencyType()),
                                  question.getContent(), question.getGuidanceMessage());
    }
}
