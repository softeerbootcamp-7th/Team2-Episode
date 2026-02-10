package com.yat2.episode.question.dto;


import com.yat2.episode.question.Question;

public record QuestionSummary(
        int id,
        String content
) {
    public static QuestionSummary of(Question question) {
        return new QuestionSummary(question.getId(), question.getContent());
    }
}
