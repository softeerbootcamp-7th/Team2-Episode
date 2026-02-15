package com.yat2.episode.competency.dto;

import com.yat2.episode.competency.CompetencyType;

public record CompetencyTypeRes(
        CompetencyType.Category category,
        String competencyType
) {
    public static CompetencyTypeRes of(CompetencyType competencyType) {
        return new CompetencyTypeRes(competencyType.getCategory(), competencyType.getTypeName());
    }
}
