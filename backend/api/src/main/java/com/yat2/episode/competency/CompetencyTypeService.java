package com.yat2.episode.competency;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import com.yat2.episode.competency.dto.CompetencyTypeRes;

@Service
@RequiredArgsConstructor
public class CompetencyTypeService {
    private final CompetencyTypeRepository competencyTypeRepository;

    public List<CompetencyTypeRes> getAllData() {
        return competencyTypeRepository.findAll().stream().map(CompetencyTypeRes::of).toList();
    }
}
