package com.yat2.episode.competency;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.yat2.episode.competency.dto.CompetencyTypeRes;

@Service
@RequiredArgsConstructor
public class CompetencyTypeService {
    private final CompetencyTypeRepository competencyTypeRepository;

    public List<CompetencyTypeRes> getAllData() {
        return competencyTypeRepository.findAll().stream().map(CompetencyTypeRes::of)
                .sorted(java.util.Comparator.comparing(CompetencyTypeRes::id)).toList();
    }

    public List<CompetencyTypeRes> getCompetencyTypesInIds(Iterable<Integer> ids) {
        return competencyTypeRepository.findAllById(ids).stream().map(CompetencyTypeRes::of)
                .sorted(java.util.Comparator.comparing(CompetencyTypeRes::id)).toList();
    }

    public Map<Integer, CompetencyTypeRes> getCompetencyTypeResMap(Iterable<Integer> ids) {
        return competencyTypeRepository.findAllById(ids).stream().map(CompetencyTypeRes::of)
                .collect(Collectors.toMap(CompetencyTypeRes::id, Function.identity()));
    }

    public long countByIdIn(Set<Integer> ids) {
        return competencyTypeRepository.countByIdIn(ids);
    }
}
