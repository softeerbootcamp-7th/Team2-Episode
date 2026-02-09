package com.yat2.episode.episode;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetailRes;
import com.yat2.episode.episode.dto.EpisodeUpsertReq;
import com.yat2.episode.mindmap.MindmapAccessValidator;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EpisodeService {

    private final EpisodeRepository episodeRepository;
    private final MindmapAccessValidator mindmapAccessValidator;

    public EpisodeDetailRes upsertEpisode(UUID nodeId, long userId, UUID mindmapId, EpisodeUpsertReq episodeUpsertReq) {
        EpisodeId episodeId = new EpisodeId(nodeId, userId);

        Episode episode = episodeRepository.findById(episodeId).map(existingEpisode -> {
            existingEpisode.update(episodeUpsertReq);
            return existingEpisode;
        }).orElseGet(() -> createNewEpisode(episodeId, mindmapId, episodeUpsertReq));

        return EpisodeDetailRes.of(episode);
    }

    private Episode createNewEpisode(EpisodeId episodeId, UUID mindmapId, EpisodeUpsertReq req) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, episodeId.getUserId());

        Episode newEpisode = Episode.create(episodeId.getNodeId(), episodeId.getUserId(), mindmapId);
        newEpisode.update(req);

        return episodeRepository.save(newEpisode);
    }
}
