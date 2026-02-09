package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface EpisodeRepository extends JpaRepository<Episode, EpisodeId> {
    List<Episode> findByMindmapIdAndIdUserId(UUID mindmapId, long userId);
}
