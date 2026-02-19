package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.mindmap.dto.MindmapCompetencyRow;

@Repository
public interface EpisodeStarRepository extends JpaRepository<EpisodeStar, EpisodeId> {
    @Query(
            """
                        SELECT s
                        FROM EpisodeStar s
                        JOIN FETCH s.episode e
                        LEFT JOIN FETCH s.competencyTypeIds
                        WHERE s.id.nodeId = :nodeId
                          AND s.id.userId = :userId
                    """
    )
    Optional<EpisodeStar> findStarDetail(
            @Param("nodeId") UUID nodeId,
            @Param("userId") long userId
    );

    @Query(
            """
                        SELECT DISTINCT ctId
                        FROM EpisodeStar es
                        JOIN es.episode e
                        JOIN es.competencyTypeIds ctId
                        WHERE e.mindmapId = :mindmapId
                          AND es.id.userId = :userId
                    """
    )
    List<Integer> findCompetencyTypesByMindmapId(
            @Param("mindmapId") UUID mindmapId,
            @Param("userId") long userId
    );

    @Query(
            """
                        SELECT DISTINCT s
                        FROM EpisodeStar s
                        JOIN FETCH s.episode e
                        JOIN FETCH s.competencyTypeIds ctId
                        WHERE s.id.userId = :userId
                          AND e.mindmapId IN :mindmapIds
                          AND (
                            :keyword IS NULL OR :keyword = '' OR
                            e.content LIKE %:keyword% OR
                            s.situation LIKE %:keyword% OR
                            s.task LIKE %:keyword% OR
                            s.action LIKE %:keyword% OR
                            s.result LIKE %:keyword%
                          ) ORDER BY s.createdAt DESC
                    """
    )
    List<EpisodeStar> searchEpisodes(
            @Param("userId") long userId,
            @Param("mindmapIds") List<UUID> mindmapIds,
            @Param("keyword") String keyword
    );

    @Query(
            """
                        SELECT DISTINCT new com.yat2.episode.mindmap.dto.MindmapCompetencyRow(e.mindmapId, ctId)
                        FROM EpisodeStar es
                        JOIN es.episode e
                        JOIN es.competencyTypeIds ctId
                        WHERE e.mindmapId IN :mindmapIds
                          AND es.id.userId = :userId
                    """
    )
    List<MindmapCompetencyRow> findCompetencyTypesByMindmapIds(
            @Param("mindmapIds") List<UUID> mindmapIds,
            @Param("userId") long userId
    );
}
