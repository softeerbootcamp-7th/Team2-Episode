package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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

    @Modifying(clearAutomatically = true)
    @Query(
            "UPDATE Episode e SET e.content = :content, e.updatedAtContent = :clientTime " +
            "WHERE e.id.nodeId = :nodeId AND (e.updatedAtContent = NULL OR e.updatedAtContent < :clientTime)"
    )
    int updateContentIfNewer(
            @Param("nodeId") UUID nodeId,
            @Param("content") String content,
            @Param("clientTime") LocalDateTime clientTime
    );
}
