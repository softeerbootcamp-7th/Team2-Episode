package com.yat2.episode.competency.dto;

import com.yat2.episode.competency.CompetencyType;

public record CompetencyTypeDto(
        Integer id,
        CompetencyType.Category category,
        String competencyType
) {
    public static CompetencyTypeDto of(CompetencyType competencyType) {
        return new CompetencyTypeDto(competencyType.getId(), competencyType.getCategory(),
                                     competencyType.getTypeName());
    }
}
