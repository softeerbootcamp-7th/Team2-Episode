package com.yat2.episode.competency;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompetencyTypeRepository extends JpaRepository<CompetencyType, Integer> {

    long countByIdIn(List<Integer> ids);
}
