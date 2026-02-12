package com.yat2.episode.episode;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.yat2.episode.competency.CompetencyTypeRepository;
import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.EpisodeSummaryRes;
import com.yat2.episode.episode.dto.EpisodeUpdateContentReq;
import com.yat2.episode.episode.dto.EpisodeUpsertReq;
import com.yat2.episode.episode.dto.StarUpdateReq;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EpisodeService {

    private final EpisodeRepository episodeRepository;
    private final CompetencyTypeRepository competencyTypeRepository;
    private final StarRepository starRepository;
    private final MindmapAccessValidator mindmapAccessValidator;

    public EpisodeDetail getEpisode(UUID nodeId, long userId) {
        return getEpisodeAndStarOrThrow(nodeId, userId);
    }

    public List<EpisodeSummaryRes> getMindmapEpisodes(UUID mindmapId, long userId) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);

        return episodeRepository.findDetailsByMindmapIdAndUserId(mindmapId, userId).stream().map(EpisodeSummaryRes::of)
                .toList();
    }

    @Transactional
    public EpisodeDetail upsertEpisode(UUID nodeId, long userId, UUID mindmapId, EpisodeUpsertReq episodeUpsertReq) {
        EpisodeId episodeId = new EpisodeId(nodeId, userId);
        validateDates(episodeUpsertReq.startDate(), episodeUpsertReq.endDate());
        validateCompetencyIds(episodeUpsertReq.competencyTypeIds());

        Episode episode = episodeRepository.findById(nodeId).orElseGet(() -> createNewEpisode(episodeId, mindmapId));
        Star star = starRepository.findById(episodeId).orElseGet(() -> createNewStar(episodeId, mindmapId));
        episode.update(episodeUpsertReq);
        star.update(episodeUpsertReq);

        return EpisodeDetail.of(episode, star);
    }

    @Transactional
    public void updateStar(UUID nodeId, long userId, StarUpdateReq starUpdateReq) {
        getEpisodeOrThrow(nodeId, userId);
        Star star = getStarOrThrow(nodeId, userId);
        validateDates(starUpdateReq.startDate(), starUpdateReq.endDate());
        validateCompetencyIds(starUpdateReq.competencyTypeIds());
        star.update(starUpdateReq);
    }

    @Transactional
    public void updateContentEpisode(UUID nodeId, long userId, EpisodeUpdateContentReq episodeUpdateContentReq) {
        Episode episode = getEpisodeOrThrow(nodeId, userId);

        mindmapAccessValidator.findParticipantOrThrow(episode.getMindmapId(), userId);
        episode.update(episodeUpdateContentReq);
    }

    @Transactional
    public void deleteEpisode(UUID nodeId, long userId) {
        starRepository.deleteById(new EpisodeId(nodeId, userId));
    }

    @Transactional
    public void clearEpisodeDates(UUID nodeId, long userId) {
        Episode episode = getEpisodeOrThrow(nodeId, userId);
        Star star = getStarOrThrow(nodeId, userId);
        star.clearDates();
    }

    private Episode getEpisodeOrThrow(UUID nodeId, long userId) {
        EpisodeId episodeId = new EpisodeId(nodeId, userId);

        return episodeRepository.findById(nodeId).orElseThrow(() -> new CustomException(ErrorCode.EPISODE_NOT_FOUND));
    }

    private EpisodeDetail getEpisodeAndStarOrThrow(UUID nodeId, long userId) {
        return episodeRepository.findDetail(nodeId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.EPISODE_NOT_FOUND));
    }

    private Star getStarOrThrow(UUID nodeId, long userId) {
        EpisodeId episodeId = new EpisodeId(nodeId, userId);
        return starRepository.findById(episodeId).orElseThrow(() -> new CustomException(ErrorCode.EPISODE_NOT_FOUND));
    }

    private Episode createNewEpisode(EpisodeId episodeId, UUID mindmapId) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, episodeId.getUserId());

        Episode newEpisode = Episode.create(episodeId.getNodeId(), mindmapId);

        return episodeRepository.save(newEpisode);
    }

    private Star createNewStar(EpisodeId episodeId, UUID mindmapId) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, episodeId.getUserId());

        Star newStar = Star.create(episodeId.getNodeId(), episodeId.getUserId());

        return starRepository.save(newStar);
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
