package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetail;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, UUID> {
    @Query("SELECT e.id FROM Episode e WHERE e.mindmapId = :mindmapId")
    List<UUID> findNodeIdsByMindmapId(
            @Param("mindmapId") UUID mindmapId
    );

    @Query(
            """
                    SELECT new com.yat2.episode.episode.dto.EpisodeDetail(
                        e.id, e.mindmapId, s.competencyTypeIds, e.content,
                        s.situation, s.task, s.action, s.result,
                        s.startDate, s.endDate, s.createdAt, s.updatedAt
                    )
                    FROM Episode e
                    JOIN EpisodeStar s ON e.id = s.id.nodeId
                    WHERE e.mindmapId = :mindmapId
                      AND s.id.userId = :userId
                    """
    )
    List<EpisodeDetail> findDetailsByMindmapIdAndUserId(
            @Param("mindmapId") UUID mindmapId,
            @Param("userId") Long userId
    );

    @Query(
            value = """
                    SELECT DISTINCT jt.ct_id
                    FROM episodes e
                    JOIN episode_stars es ON es.node_id = e.node_id
                    JOIN JSON_TABLE(
                      es.competency_type_ids,
                      '$[*]' COLUMNS (
                        ct_id INT PATH '$'
                      )
                    ) jt
                    WHERE e.mindmap_id = :mindmapId
                    """, nativeQuery = true
    )
    List<Integer> findCompetencyTypesByMindmapId(
            @Param("mindmapId") UUID mindmapId
    );

    @Query(
            """
                    SELECT new com.yat2.episode.episode.dto.EpisodeDetail(
                        e.id, e.mindmapId, s.competencyTypeIds, e.content,
                        s.situation, s.task, s.action, s.result,
                        s.startDate, s.endDate, s.createdAt, s.updatedAt
                    )
                    FROM Episode e
                    JOIN EpisodeStar s ON e.id = s.id.nodeId
                    WHERE e.id = :nodeId
                      AND s.id.userId = :userId
                    """
    )
    Optional<EpisodeDetail> findDetail(
            @Param("nodeId") UUID nodeId,
            @Param("userId") Long userId
    );
}
