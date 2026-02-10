package com.yat2.episode.competency;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompetencyTypeRepository extends JpaRepository<CompetencyType, Integer> {
    @Query(
            "SELECT DISTINCT e.competencyType FROM Episode e " + "WHERE e.mindmap.id = :mindmapId"
    )
    List<CompetencyType> findByMindmapId(
            @Param("mindmapId") UUID mindmapId
    );
}
