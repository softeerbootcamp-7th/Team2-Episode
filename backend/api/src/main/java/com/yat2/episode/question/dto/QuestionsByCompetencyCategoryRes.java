package com.yat2.episode.question.dto;

import java.util.List;

import com.yat2.episode.competency.CompetencyType;

public record QuestionsByCompetencyCategoryRes(
        CompetencyType.Category category,
        List<QuestionSummary> questions
) {}
