package com.yat2.episode.mindmap;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.yat2.episode.competency.CompetencyTypeService;
import com.yat2.episode.competency.dto.CompetencyTypeRes;
import com.yat2.episode.episode.EpisodeRepository;
import com.yat2.episode.episode.EpisodeStar;
import com.yat2.episode.episode.EpisodeStarRepository;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.constants.MindmapConstants;
import com.yat2.episode.mindmap.constants.MindmapVisibility;
import com.yat2.episode.mindmap.dto.MindmapCompetencyRow;
import com.yat2.episode.mindmap.dto.request.MindmapCreateReq;
import com.yat2.episode.mindmap.dto.response.MindmapDetailRes;
import com.yat2.episode.mindmap.dto.response.MindmapSessionJoinRes;
import com.yat2.episode.mindmap.dto.response.MindmapSummaryRes;
import com.yat2.episode.mindmap.jwt.MindmapJwtProvider;
import com.yat2.episode.mindmap.s3.S3ObjectKeyGenerator;
import com.yat2.episode.mindmap.s3.S3SnapshotRepository;
import com.yat2.episode.mindmap.s3.dto.S3UploadFieldsRes;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserService;

@Transactional(readOnly = true)
@RequiredArgsConstructor
@Service
public class MindmapService {
    private final MindmapRepository mindmapRepository;
    private final MindmapAccessValidator mindmapAccessValidator;
    private final MindmapParticipantRepository mindmapParticipantRepository;
    private final S3SnapshotRepository snapshotRepository;
    private final UserService userService;
    private final S3ObjectKeyGenerator s3ObjectKeyGenerator;
    private final MindmapJwtProvider mindmapJwtProvider;
    private final EpisodeRepository episodeRepository;
    private final EpisodeStarRepository episodeStarRepository;
    private final CompetencyTypeService competencyTypeService;

    public MindmapDetailRes getMindmapById(Long userId, UUID mindmapId) {

        List<MindmapParticipant> participants = mindmapParticipantRepository.findAllByMindmapIdWithUser(mindmapId);
        MindmapParticipant p = mindmapAccessValidator.findUserInParticipantsOrThrow(participants, userId);
        List<Integer> competencyTypeIds = getSortedCompetencyTypeIds(mindmapId, userId);
        List<CompetencyTypeRes> ctResList = competencyTypeService.getCompetencyTypesInIds(competencyTypeIds);
        return MindmapDetailRes.of(p, ctResList,
                                   participants.stream().map((participant) -> participant.getUser().getNickname())
                                           .toList());
    }

    public List<MindmapDetailRes> getMindmaps(Long userId, MindmapVisibility type) {
        List<MindmapParticipant> participants = switch (type) {
            case PRIVATE ->
                    mindmapParticipantRepository.findByUserIdAndSharedOrderByFavoriteAndUpdatedDesc(userId, false);
            case PUBLIC ->
                    mindmapParticipantRepository.findByUserIdAndSharedOrderByFavoriteAndUpdatedDesc(userId, true);
            default -> mindmapParticipantRepository.findByUserIdOrderByFavoriteAndUpdatedDesc(userId);
        };

        if (participants.isEmpty()) return List.of();

        List<UUID> mindmapIds = participants.stream().map(p -> p.getMindmap().getId()).distinct().toList();

        Map<UUID, Set<Integer>> competencyMap = new HashMap<>();
        for (MindmapCompetencyRow row : episodeStarRepository.findCompetencyTypesByMindmapIds(mindmapIds, userId)) {
            competencyMap.computeIfAbsent(row.mindmapId(), k -> new HashSet<>()).add(row.competencyTypeId());
        }

        Set<Integer> allCompetencyIds =
                competencyMap.values().stream().flatMap(Set::stream).collect(Collectors.toSet());

        Map<Integer, CompetencyTypeRes> competencyResMap =
                competencyTypeService.getCompetencyTypesInIds(allCompetencyIds).stream()
                        .collect(Collectors.toMap(CompetencyTypeRes::id, java.util.function.Function.identity()));

        Map<UUID, List<String>> participantNames = participants.stream().collect(
                Collectors.groupingBy(p -> p.getMindmap().getId(),
                                      Collectors.mapping(p -> p.getUser().getNickname(), Collectors.toList())));
        return participants.stream().map(p -> {
            UUID id = p.getMindmap().getId();
            List<CompetencyTypeRes> ctResList =
                    competencyMap.getOrDefault(id, Set.of()).stream().sorted().map(competencyResMap::get)
                            .filter(java.util.Objects::nonNull).toList();
            return MindmapDetailRes.of(p, ctResList, participantNames.getOrDefault(p.getMindmap().getId(), List.of()));
        }).toList();
    }


    public List<MindmapSummaryRes> getMindmapList(Long userId) {
        return mindmapRepository.findByUserIdOrderByCreatedDesc(userId).stream().map(MindmapSummaryRes::of).toList();
    }

    @Transactional
    public MindmapSummaryRes saveMindmapAndParticipant(long userId, MindmapCreateReq body, UUID mindmapId) {
        User user = userService.getUserOrThrow(userId);
        String finalTitle = body.title();
        if (finalTitle == null || finalTitle.isBlank()) {
            if (body.isShared()) throw new CustomException(ErrorCode.MINDMAP_TITLE_REQUIRED);
            finalTitle = getPrivateMindmapName(user);
        }

        Mindmap mindmap = new Mindmap(mindmapId, finalTitle, body.isShared());
        mindmapRepository.save(mindmap);

        MindmapParticipant participant = new MindmapParticipant(user, mindmap);
        mindmapParticipantRepository.save(participant);

        return MindmapSummaryRes.of(participant);
    }

    public S3UploadFieldsRes getUploadInfo(UUID mindmapId) {
        return snapshotRepository.createPresignedUploadInfo(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId));
    }

    private String getPrivateMindmapName(User user) {
        String baseName = user.getNickname() + MindmapConstants.PRIVATE_NAME;
        List<String> allNames = mindmapRepository.findAllNamesByBaseName(baseName, user.getKakaoId());

        if (allNames.isEmpty()) {
            return baseName;
        }
        int maxNum = -1;
        boolean baseNameExists = false;
        String prefixWithBracket = baseName + "(";

        for (String name : allNames) {
            if (name.equals(baseName)) {
                baseNameExists = true;
                continue;
            }
            if (name.startsWith(prefixWithBracket) && name.endsWith(")")) {
                try {
                    String numPart = name.substring(prefixWithBracket.length(), name.length() - 1);
                    maxNum = Math.max(maxNum, Integer.parseInt(numPart));
                } catch (NumberFormatException ignored) {
                }
            }
        }
        if (!baseNameExists) {
            return baseName;
        }
        StringBuilder sb = new StringBuilder(baseName);
        if (maxNum == -1) {
            sb.append("(1)");
        } else {
            sb.append("(").append(maxNum + 1).append(")");
        }

        return sb.toString();
    }

    @Transactional
    public void deleteMindmap(long userId, UUID mindmapId) {
        Mindmap mindmap = mindmapRepository.findByIdWithLock(mindmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.MINDMAP_NOT_FOUND));

        int deletedCount = mindmapParticipantRepository.deleteByMindmap_IdAndUser_KakaoId(mindmapId, userId);
        if (deletedCount == 0) throw new CustomException(ErrorCode.MINDMAP_NOT_FOUND);

        boolean hasOtherParticipants = mindmapParticipantRepository.existsByMindmap_Id(mindmapId);

        if (!hasOtherParticipants) {
            mindmapRepository.delete(mindmap);
        }
    }

    @Transactional
    public MindmapSummaryRes updateFavoriteStatus(long userId, UUID mindmapId, boolean status) {
        MindmapParticipant participant = mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);
        participant.updateFavorite(status);

        return MindmapSummaryRes.of(participant);
    }

    @Transactional
    public MindmapSummaryRes updateName(long userId, UUID mindmapId, String name) {
        MindmapParticipant participant = mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);
        participant.getMindmap().updateName(name);

        return MindmapSummaryRes.of(participant);
    }

    @Transactional
    public MindmapSummaryRes saveMindmapParticipant(long userId, UUID mindmapId) {
        User user = userService.getUserOrThrow(userId);
        Mindmap mindmap = mindmapAccessValidator.validateTeamMindmap(mindmapId);

        MindmapParticipant participant =
                mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, userId).orElseGet(() -> {
                    MindmapParticipant savedParticipant =
                            mindmapParticipantRepository.save(new MindmapParticipant(user, mindmap));

                    List<UUID> existingEpisodeNodeIds = episodeRepository.findNodeIdsByMindmapId(mindmapId);

                    if (!existingEpisodeNodeIds.isEmpty()) {
                        List<EpisodeStar> starsToCreate =
                                existingEpisodeNodeIds.stream().map(nodeId -> EpisodeStar.create(nodeId, userId))
                                        .toList();
                        episodeStarRepository.saveAll(starsToCreate);
                    }
                    return savedParticipant;
                });

        return MindmapSummaryRes.of(participant);
    }

    public MindmapSessionJoinRes joinMindmapSession(long userId, UUID mindmapId) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);
        String ticket = mindmapJwtProvider.issue(userId, mindmapId);

        String presignedUrl =
                snapshotRepository.createPresignedGetURL(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId));

        return new MindmapSessionJoinRes(ticket, presignedUrl);
    }

    public List<CompetencyTypeRes> getCompetencyTypesInMindmap(UUID mindmapId, long userId) {
        mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);
        List<Integer> ids = getSortedCompetencyTypeIds(mindmapId, userId);
        return competencyTypeService.getCompetencyTypesInIds(ids);
    }

    private List<Integer> getSortedCompetencyTypeIds(UUID mindmapId, long userId) {
        return episodeStarRepository.findCompetencyTypesByMindmapId(mindmapId, userId).stream().sorted().toList();
    }

}
