package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EpisodeStarRepository extends JpaRepository<EpisodeStar, EpisodeId> {}
