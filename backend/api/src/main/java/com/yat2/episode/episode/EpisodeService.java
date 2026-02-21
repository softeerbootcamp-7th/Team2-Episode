package com.yat2.episode.episode;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.yat2.episode.competency.CompetencyTypeService;
import com.yat2.episode.competency.dto.CompetencyTypeRes;
import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.request.EpisodeDeleteBatchReq;
import com.yat2.episode.episode.dto.request.EpisodeSearchReq;
import com.yat2.episode.episode.dto.request.EpisodeUpsertBatchReq;
import com.yat2.episode.episode.dto.request.EpisodeUpsertContentReq;
import com.yat2.episode.episode.dto.request.EpisodeUpsertItemReq;
import com.yat2.episode.episode.dto.request.StarUpdateReq;
import com.yat2.episode.episode.dto.response.EpisodeSummaryRes;
import com.yat2.episode.episode.dto.response.MindmapEpisodeRes;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;
import com.yat2.episode.mindmap.MindmapParticipant;
import com.yat2.episode.mindmap.MindmapParticipantRepository;
import com.yat2.episode.mindmap.constants.MindmapVisibility;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EpisodeService {

    private final static String DELETE_DATE = "0000-00-00";
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

    @Transactional(readOnly = true)
    public List<MindmapEpisodeRes> searchEpisodes(long userId, EpisodeSearchReq req) {
        List<MindmapParticipant> participants = findParticipantsByFilter(userId, req);

        if (participants.isEmpty()) return List.of();

        List<UUID> allowedMindmapIds = participants.stream().map(p -> p.getMindmap().getId()).toList();
        String keyword = (req.search() == null) ? null : req.search().trim();
        List<EpisodeStar> episodeStars = episodeStarRepository.searchEpisodes(userId, allowedMindmapIds, keyword);

        if (episodeStars.isEmpty()) {
            return List.of();
        }

        return toMindmapEpisodeResList(episodeStars, participants);
    }

    private LocalDate getLocalDate(String date) {
        if (date == null) return null;
        try {
            return LocalDate.parse(date);
        } catch (Exception e) {
            return null;
        }
    }

    private List<MindmapEpisodeRes> toMindmapEpisodeResList(
            List<EpisodeStar> stars, List<MindmapParticipant> participants) {
        if (stars == null || stars.isEmpty()) return List.of();
        Map<Integer, CompetencyTypeRes> ctResMap = competencyTypeService.getAllData().stream()
                .collect(Collectors.toMap(CompetencyTypeRes::id, Function.identity()));

        Map<UUID, MindmapParticipant> participantByMindmapId = participants.stream()
                .collect(Collectors.toMap(p -> p.getMindmap().getId(), Function.identity(), (a, b) -> a));

        Map<UUID, List<EpisodeDetail>> episodeDetailsByMindmapId = new LinkedHashMap<>();

        for (EpisodeStar s : stars) {
            Episode e = s.getEpisode();

            EpisodeDetail detail = buildEpisodeDetail(e, s, ctResMap);
            episodeDetailsByMindmapId.computeIfAbsent(e.getMindmapId(), k -> new ArrayList<>()).add(detail);
        }

        List<MindmapEpisodeRes> result = new ArrayList<>(episodeDetailsByMindmapId.size());

        for (Map.Entry<UUID, List<EpisodeDetail>> entry : episodeDetailsByMindmapId.entrySet()) {
            UUID mindmapId = entry.getKey();
            List<EpisodeDetail> details = entry.getValue();

            MindmapParticipant p = participantByMindmapId.get(mindmapId);
            if (p == null) continue;

            String mindmapName = p.getMindmap().getName();
            boolean isShared = p.getMindmap().isShared();

            result.add(new MindmapEpisodeRes(mindmapId, mindmapName, isShared, List.copyOf(details)));
        }

        return List.copyOf(result);
    }


    private List<MindmapParticipant> findParticipantsByFilter(long userId, EpisodeSearchReq req) {
        MindmapVisibility type = req.mindmapType();

        if (req.mindmapId() != null) {
            mindmapAccessValidator.findMindmapOrThrow(req.mindmapId());
            return List.of(mindmapAccessValidator.findParticipantOrThrow(req.mindmapId(), userId));
        }

        return switch (type) {
            case PRIVATE -> mindmapParticipantRepository.findByUserIdAndSharedOrderByLastJoinedDesc(userId, false);
            case PUBLIC -> mindmapParticipantRepository.findByUserIdAndSharedOrderByLastJoinedDesc(userId, true);
            case ALL -> mindmapParticipantRepository.findByUserIdOrderByLastJoinedDesc(userId);
        };
    }

    @Transactional
    public EpisodeDetail upsertEpisode(
            UUID nodeId, long userId, UUID mindmapId,
            EpisodeUpsertContentReq episodeUpsertReq
    ) {
        mindmapAccessValidator.findMindmapOrThrow(mindmapId);

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
    public List<EpisodeDetail> upsertEpisodes(UUID mindmapId, long userId, EpisodeUpsertBatchReq items) {
        mindmapAccessValidator.findMindmapOrThrow(mindmapId);

        if (items == null || items.items().isEmpty()) return List.of();

        Map<UUID, String> reqByNodeId = new LinkedHashMap<>();
        for (EpisodeUpsertItemReq it : items.items()) {
            if (it == null || it.nodeId() == null) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            reqByNodeId.put(it.nodeId(), it.content() == null ? null : it.content());
        }
        List<UUID> nodeIds = new ArrayList<>(reqByNodeId.keySet());

        List<Episode> existing = episodeRepository.findAllById(nodeIds);
        Map<UUID, Episode> episodeMap = new HashMap<>();
        for (Episode e : existing) {
            if (!mindmapId.equals(e.getMindmapId())) {
                throw new CustomException(ErrorCode.EPISODE_NOT_FOUND);
            }
            episodeMap.put(e.getId(), e);
        }

        List<UUID> toCreate = nodeIds.stream().filter(id -> !episodeMap.containsKey(id)).toList();

        if (!toCreate.isEmpty()) {
            mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);

            List<MindmapParticipant> participants = mindmapParticipantRepository.findAllByMindmapIdWithUser(mindmapId);

            List<Episode> newEpisodes = toCreate.stream().map(nodeId -> Episode.create(nodeId, mindmapId)).toList();
            episodeRepository.saveAll(newEpisodes);

            List<EpisodeStar> newStars = new ArrayList<>(toCreate.size() * participants.size());
            for (UUID nodeId : toCreate) {
                for (MindmapParticipant p : participants) {
                    newStars.add(EpisodeStar.create(nodeId, p.getUser().getKakaoId()));
                }
            }
            episodeStarRepository.saveAll(newStars);

            for (Episode e : newEpisodes) {
                episodeMap.put(e.getId(), e);
            }
        }

        List<EpisodeId> starIds = nodeIds.stream().map(nodeId -> new EpisodeId(nodeId, userId)).toList();

        List<EpisodeStar> stars = episodeStarRepository.findAllById(starIds);
        Map<UUID, EpisodeStar> starMap = new HashMap<>();
        for (EpisodeStar s : stars) {
            starMap.put(s.getId().getNodeId(), s);
        }

        List<EpisodeDetail> result = new ArrayList<>(nodeIds.size());
        for (UUID nodeId : nodeIds) {
            Episode episode = episodeMap.get(nodeId);
            if (episode == null) throw new CustomException(ErrorCode.EPISODE_NOT_FOUND);

            EpisodeStar episodeStar = starMap.get(nodeId);
            if (episodeStar == null) throw new CustomException(ErrorCode.EPISODE_STAR_NOT_FOUND);

            String req = reqByNodeId.get(nodeId);
            episode.updateContent(req);

            result.add(buildEpisodeDetail(episode, episodeStar));
        }

        return result;
    }

    @Transactional
    public void updateStar(UUID nodeId, long userId, StarUpdateReq starUpdateReq) {
        validateCompetencyIds(starUpdateReq.competencyTypeIds());
        EpisodeStar episodeStar = getStarOrThrow(nodeId, userId);
        LocalDate newStart = calculateNewDate(starUpdateReq.startDate(), episodeStar.getStartDate());
        LocalDate newEnd = calculateNewDate(starUpdateReq.endDate(), episodeStar.getEndDate());
        validateDates(newStart, newEnd);

        episodeStar.update(starUpdateReq, newStart, newEnd);
    }

    private LocalDate calculateNewDate(String dateString, LocalDate existingDate) {
        if (isDeleteDate(dateString)) {
            return null;
        }
        return resolvePatchedDate(getLocalDate(dateString), existingDate);
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
    public void deleteEpisodes(EpisodeDeleteBatchReq req, long userId) {
        if (req == null || req.nodeIds().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        List<UUID> dedup = req.nodeIds().stream().distinct().toList();

        List<UUID> allowed = episodeStarRepository.findNodeIdsByUserIdAndNodeIdIn(userId, dedup);

        if (allowed.size() != dedup.size()) {
            throw new CustomException(ErrorCode.EPISODE_NOT_FOUND);
        }

        episodeRepository.deleteAllByIdInBatch(dedup);
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

    private EpisodeDetail buildEpisodeDetail(Episode e, EpisodeStar s, Map<Integer, CompetencyTypeRes> ctMap) {
        List<CompetencyTypeRes> ctResList = (s.getCompetencyTypeIds() == null) ? List.of() :
                                            s.getCompetencyTypeIds().stream().map(ctMap::get).filter(Objects::nonNull)
                                                    .sorted(Comparator.comparing(CompetencyTypeRes::id)).toList();

        return EpisodeDetail.of(e, s, ctResList);
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

    private LocalDate resolvePatchedDate(LocalDate newDate, LocalDate before) {
        if (newDate == null) {
            return before;
        }
        return newDate;
    }

    private boolean isDeleteDate(String date) {
        return DELETE_DATE.equals(date);
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
