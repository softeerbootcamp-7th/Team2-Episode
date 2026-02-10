package com.yat2.episode.competency;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.competency.dto.CompetencyTypeDto;
import com.yat2.episode.episode.EpisodeRepository;

@Service
@RequiredArgsConstructor
public class CompetencyTypeService {
    private final CompetencyTypeRepository competencyTypeRepository;
    private final EpisodeRepository episodeRepository;

    public List<CompetencyTypeDto> getAllData() {
        return competencyTypeRepository.findAll().stream().map(CompetencyTypeDto::of).toList();
    }

    public List<Integer> getCompetencyTypesInMindmap(UUID mindmapId) {
        return episodeRepository.findCompetencyTypesByMindmapId(mindmapId);
    }
}
