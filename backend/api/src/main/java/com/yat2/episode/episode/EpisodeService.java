package com.yat2.episode.episode;

import lombok.RequiredArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.yat2.episode.competency.CompetencyTypeService;
import com.yat2.episode.competency.dto.CompetencyTypeRes;
import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.EpisodeSummaryRes;
import com.yat2.episode.episode.dto.EpisodeUpsertContentReq;
import com.yat2.episode.episode.dto.StarUpdateReq;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;
import com.yat2.episode.mindmap.MindmapParticipant;
import com.yat2.episode.mindmap.MindmapParticipantRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EpisodeService {

    private final EpisodeRepository episodeRepository;
    private final CompetencyTypeService competencyTypeService;
    private final EpisodeStarRepository episodeStarRepository;
    private final MindmapAccessValidator mindmapAccessValidator;
    private final MindmapParticipantRepository mindmapParticipantRepository;

    public EpisodeDetail getEpisodeDetail(UUID nodeId, long userId) {
        return getEpisodeAndStarOrThrow(nodeId, userId);
    }

    public List<EpisodeSummaryRes> getMindmapEpisodes(UUID mindmapId, long userId) {
        return episodeRepository.findSummariesByMindmapIdAndUserId(mindmapId, userId);
    }

    @Transactional
    public EpisodeDetail upsertEpisode(
            UUID nodeId, long userId, UUID mindmapId,
            EpisodeUpsertContentReq episodeUpsertReq
    ) {
        EpisodeId episodeId = new EpisodeId(nodeId, userId);
        Episode episode = episodeRepository.findById(nodeId).orElseGet(() -> {
            mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);
            Episode newEpisode = createNewEpisode(episodeId, mindmapId);
            List<MindmapParticipant> participants = mindmapParticipantRepository.findAllByMindmapIdWithUser(mindmapId);

            List<EpisodeStar> stars =
                    participants.stream().map(p -> EpisodeStar.create(nodeId, p.getUser().getKakaoId())).toList();

            episodeStarRepository.saveAll(stars);

            return newEpisode;
        });
        if (!mindmapId.equals(episode.getMindmapId())) throw new CustomException(ErrorCode.EPISODE_NOT_FOUND);
        EpisodeStar episodeStar = episodeStarRepository.findById(episodeId)
                .orElseThrow(() -> new CustomException(ErrorCode.EPISODE_STAR_NOT_FOUND));
        episode.update(episodeUpsertReq);

        return buildEpisodeDetail(episode, episodeStar);
    }

    @Transactional
    public void updateStar(UUID nodeId, long userId, StarUpdateReq starUpdateReq) {
        validateCompetencyIds(starUpdateReq.competencyTypeIds());
        EpisodeStar episodeStar = getStarOrThrow(nodeId, userId);
        LocalDate newStart = resolvePatchedDate(starUpdateReq.startDate(), episodeStar.getStartDate());
        LocalDate newEnd = resolvePatchedDate(starUpdateReq.endDate(), episodeStar.getEndDate());

        validateDates(newStart, newEnd);
        episodeStar.update(starUpdateReq);
    }

    @Transactional
    public void clearStar(UUID nodeId, long userId) {

        EpisodeStar episodeStar = getStarOrThrow(nodeId, userId);
        episodeStar.clearAll();
        episodeStarRepository.save(episodeStar);
    }

    @Transactional
    public void deleteEpisode(UUID nodeId, long userId) {
        EpisodeDetail episodeDetail = getEpisodeAndStarOrThrow(nodeId, userId);
        episodeRepository.deleteById(episodeDetail.nodeId());
    }

    @Transactional
    public void clearEpisodeDates(UUID nodeId, long userId) {
        EpisodeStar episodeStar = getStarOrThrow(nodeId, userId);
        episodeStar.clearDates();
    }

    private EpisodeDetail getEpisodeAndStarOrThrow(UUID nodeId, long userId) {
        EpisodeStar s = episodeStarRepository.findStarDetail(nodeId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.EPISODE_NOT_FOUND));
        return buildEpisodeDetail(s.getEpisode(), s);
    }

    private EpisodeDetail buildEpisodeDetail(Episode episode, EpisodeStar star) {
        List<CompetencyTypeRes> ctResList = competencyTypeService.getCompetencyTypesInIds(star.getCompetencyTypeIds());
        return EpisodeDetail.of(episode, star, ctResList);
    }

    private EpisodeStar getStarOrThrow(UUID nodeId, long userId) {
        EpisodeId episodeId = new EpisodeId(nodeId, userId);
        return episodeStarRepository.findById(episodeId)
                .orElseThrow(() -> new CustomException(ErrorCode.EPISODE_STAR_NOT_FOUND));
    }

    private Episode createNewEpisode(EpisodeId episodeId, UUID mindmapId) {
        Episode newEpisode = Episode.create(episodeId.getNodeId(), mindmapId);

        return episodeRepository.save(newEpisode);
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private LocalDate resolvePatchedDate(JsonNullable<LocalDate> patch, LocalDate before) {
        if (patch == null || patch.isUndefined()) {
            return before;
        }
        if (!patch.isPresent() || patch.get() == null) {
            return null;
        }
        return patch.get();
    }

    private void validateCompetencyIds(Set<Integer> competencyIds) {
        if (competencyIds == null || competencyIds.isEmpty()) {
            return;
        }

        long count = competencyTypeService.countByIdIn(competencyIds);
        if (count != competencyIds.size()) {
            throw new CustomException(ErrorCode.INVALID_COMPETENCY_TYPE);
        }
    }
}
