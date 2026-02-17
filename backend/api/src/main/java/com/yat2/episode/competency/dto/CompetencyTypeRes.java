package com.yat2.episode.competency.dto;

import com.yat2.episode.competency.CompetencyType;

public record CompetencyTypeRes(
        int id,
        CompetencyType.Category category,
        String competencyType
) {
    public static CompetencyTypeRes of(CompetencyType competencyType) {
        return new CompetencyTypeRes(competencyType.getId(), competencyType.getCategory(),
                                     competencyType.getTypeName());
    }
}
