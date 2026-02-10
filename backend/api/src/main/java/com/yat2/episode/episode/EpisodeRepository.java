package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, EpisodeId> {
    List<Episode> findByMindmapIdAndIdUserId(UUID mindmapId, long userId);

    @Query(
            """
                    SELECT DISTINCT ctId
                    FROM Episode e
                    JOIN e.competencyTypeIds ctId
                    WHERE e.mindmapId = :mindmapId
                    """
    )
    List<Integer> findCompetencyTypesByMindmapId(
            @Param("mindmapId") UUID mindmapId
    );

}
