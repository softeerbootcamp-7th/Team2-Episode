package com.yat2.episode.episode;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.yat2.episode.competency.CompetencyTypeRepository;
import com.yat2.episode.episode.dto.EpisodeDetailRes;
import com.yat2.episode.episode.dto.EpisodeInsertReq;
import com.yat2.episode.episode.dto.EpisodeSummaryRes;
import com.yat2.episode.episode.dto.EpisodeUpdateContentReq;
import com.yat2.episode.episode.dto.EpisodeUpdateExceptContentReq;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EpisodeService {

    private final EpisodeRepository episodeRepository;
    private final CompetencyTypeRepository competencyTypeRepository;
    private final MindmapAccessValidator mindmapAccessValidator;

    public EpisodeDetailRes getEpisode(UUID nodeId, long userId) {
        Episode episode = getEpisodeOrThrow(nodeId, userId);

        return EpisodeDetailRes.of(episode);
    }

    public List<EpisodeSummaryRes> getMindmapEpisodes(UUID mindmapId, long userId) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);

        return episodeRepository.findByMindmapIdAndIdUserId(mindmapId, userId).stream().map(EpisodeSummaryRes::of)
                .toList();
    }

    @Transactional
    public EpisodeDetailRes upsertEpisode(UUID nodeId, long userId, UUID mindmapId, EpisodeInsertReq episodeInsertReq) {
        EpisodeId episodeId = new EpisodeId(nodeId, userId);
        validateDates(episodeInsertReq.startDate(), episodeInsertReq.endDate());
        validateCompetencyIds(episodeInsertReq.competencyTypeIds());

        Episode episode = episodeRepository.findById(episodeId).orElseGet(() -> createNewEpisode(episodeId, mindmapId));

        episode.update(episodeInsertReq);

        return EpisodeDetailRes.of(episode);
    }

    @Transactional
    public void updateEpisode(UUID nodeId, long userId, EpisodeUpdateExceptContentReq episodeUpdateExceptContentReq) {
        Episode episode = getEpisodeOrThrow(nodeId, userId);
        validateDates(episodeUpdateExceptContentReq.startDate(), episodeUpdateExceptContentReq.endDate());
        validateCompetencyIds(episodeUpdateExceptContentReq.competencyTypeIds());

        episode.update(episodeUpdateExceptContentReq);
    }

    @Transactional
    public void updateContentEpisode(UUID nodeId, long userId, EpisodeUpdateContentReq episodeUpdateContentReq) {
        Episode episode = getEpisodeOrThrow(nodeId, userId);

        mindmapAccessValidator.findParticipantOrThrow(episode.getMindmapId(), userId);
        episodeRepository.updateContentIfNewer(nodeId, episodeUpdateContentReq.content(),
                                               episodeUpdateContentReq.localDateTime());
    }

    @Transactional
    public void deleteEpisode(UUID nodeId, long userId) {
        episodeRepository.deleteById(new EpisodeId(nodeId, userId));
    }

    @Transactional
    public void clearEpisodeDates(UUID nodeId, long userId) {
        Episode episode = getEpisodeOrThrow(nodeId, userId);
        episode.clearDates();
    }

    private Episode getEpisodeOrThrow(UUID nodeId, long userId) {
        EpisodeId episodeId = new EpisodeId(nodeId, userId);

        return episodeRepository.findById(episodeId)
                .orElseThrow(() -> new CustomException(ErrorCode.EPISODE_NOT_FOUND));
    }

    private Episode createNewEpisode(EpisodeId episodeId, UUID mindmapId) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, episodeId.getUserId());

        Episode newEpisode = Episode.create(episodeId.getNodeId(), episodeId.getUserId(), mindmapId);

        return episodeRepository.save(newEpisode);
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private void validateCompetencyIds(Set<Integer> competencyIds) {
        if (competencyIds == null || competencyIds.isEmpty()) {
            return;
        }

        long count = competencyTypeRepository.countByIdIn(competencyIds);
        if (count != competencyIds.size()) {
            throw new CustomException(ErrorCode.INVALID_COMPETENCY_TYPE);
        }
    }
}
