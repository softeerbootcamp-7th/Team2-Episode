package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeSummaryRes;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, UUID> {
    @Query("SELECT e.id FROM Episode e WHERE e.mindmapId = :mindmapId")
    List<UUID> findNodeIdsByMindmapId(
            @Param("mindmapId") UUID mindmapId
    );

    @Query(
            """
                    SELECT new com.yat2.episode.episode.dto.EpisodeSummaryRes(
                        e.id,
                        e.mindmapId,
                        e.content,
                        s.startDate,
                        s.endDate
                    )
                    FROM EpisodeStar s
                    JOIN s.episode e
                    WHERE e.mindmapId = :mindmapId
                      AND s.id.userId = :userId
                    """
    )
    List<EpisodeSummaryRes> findSummariesByMindmapIdAndUserId(
            @Param("mindmapId") UUID mindmapId,
            @Param("userId") long userId
    );
}
