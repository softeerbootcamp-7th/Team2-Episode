package com.yat2.episode.mindmap;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MindmapParticipantRepository extends JpaRepository<MindmapParticipant, Integer> {
    @Query(
            """
                        SELECT p
                        FROM MindmapParticipant p
                        WHERE p.mindmap.id = :uuid and p.user.kakaoId = :userId
                    """
    )
    Optional<MindmapParticipant> findByMindmapIdAndUserId(
            @Param("uuid") UUID uuid,
            @Param("userId") Long userId
    );

    @Modifying
    int deleteByMindmap_IdAndUser_KakaoId(UUID uuid, Long userId);

    @Query("SELECT p FROM MindmapParticipant p JOIN FETCH p.user WHERE p.mindmap.id = :mindmapId")
    List<MindmapParticipant> findAllByMindmapIdWithUser(
            @Param("mindmapId") UUID mindmapId
    );

    @Query(
            """
                        SELECT p
                        FROM MindmapParticipant p
                        JOIN FETCH p.mindmap m
                        JOIN FETCH p.user u
                        WHERE p.user.kakaoId = :userId
                          AND m.shared = :shared
                        ORDER BY p.isFavorite DESC, p.lastJoinedAt DESC
                    """
    )
    List<MindmapParticipant> findByUserIdAndSharedOrderByFavoriteAndLastJoinedDesc(
            @Param("userId") Long userId,
            @Param("shared") boolean shared
    );


    @Query(
            """
                        SELECT p
                        FROM MindmapParticipant p
                        JOIN FETCH p.mindmap m
                        JOIN FETCH p.user u
                        WHERE p.user.kakaoId = :userId
                        ORDER BY p.isFavorite DESC, p.lastJoinedAt DESC
                    """
    )
    List<MindmapParticipant> findByUserIdOrderByFavoriteAndLastJoinedDesc(
            @Param("userId") Long userId
    );


    @Query(
            """
                        SELECT p
                        FROM MindmapParticipant p
                        JOIN FETCH p.mindmap m
                        WHERE p.user.kakaoId = :userId
                          AND m.shared = :shared
                        ORDER BY p.lastJoinedAt DESC
                    """
    )
    List<MindmapParticipant> findByUserIdAndSharedOrderByLastJoinedDesc(
            @Param("userId") Long userId,
            @Param("shared") boolean shared
    );


    @Query(
            """
                        SELECT p
                        FROM MindmapParticipant p
                        JOIN FETCH p.mindmap m
                        WHERE p.user.kakaoId = :userId
                        ORDER BY p.lastJoinedAt DESC
                    """
    )
    List<MindmapParticipant> findByUserIdOrderByLastJoinedDesc(
            @Param("userId") Long userId
    );

}
