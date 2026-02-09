package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;

interface EpisodeRepository extends JpaRepository<Episode, EpisodeId> {}
