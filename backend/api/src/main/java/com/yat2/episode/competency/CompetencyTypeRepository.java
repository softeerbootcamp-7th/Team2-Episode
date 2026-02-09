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
            """
                    SELECT DISTINCT ctId
                    FROM Episode e
                    JOIN e.competencyTypeIds ctId
                    WHERE e.mindmapId = :mindmapId
                    """
    )
    List<Integer> findByMindmapId(
            @Param("mindmapId") UUID mindmapId
    );


}
