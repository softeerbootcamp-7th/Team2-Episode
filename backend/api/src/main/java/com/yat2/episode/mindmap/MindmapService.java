package com.yat2.episode.mindmap;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.constants.MindmapConstants;
import com.yat2.episode.mindmap.dto.MindmapCreateReq;
import com.yat2.episode.mindmap.dto.MindmapDetailRes;
import com.yat2.episode.mindmap.dto.MindmapNameRes;
import com.yat2.episode.mindmap.dto.MindmapSummaryRes;
import com.yat2.episode.mindmap.s3.S3ObjectKeyGenerator;
import com.yat2.episode.mindmap.s3.S3SnapshotRepository;
import com.yat2.episode.mindmap.s3.dto.S3UploadFieldsRes;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserService;

@RequiredArgsConstructor
@Service
public class MindmapService {
    private final MindmapRepository mindmapRepository;
    private final MindmapAccessValidator mindmapAccessValidator;
    private final MindmapParticipantRepository mindmapParticipantRepository;
    private final S3SnapshotRepository snapshotRepository;
    private final UserService userService;
    private final S3ObjectKeyGenerator s3ObjectKeyGenerator;

    public MindmapDetailRes getMindmapById(Long userId, UUID mindmapId) {
        return MindmapDetailRes.of(mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId));
    }

    @Transactional(readOnly = true)
    public List<MindmapDetailRes> getMindmaps(Long userId, MindmapController.MindmapVisibility type) {
        return switch (type) {
            case PRIVATE -> getMindmapsByShared(userId, false);
            case PUBLIC -> getMindmapsByShared(userId, true);
            default -> getAllMindmap(userId);
        };
    }

    private List<MindmapDetailRes> getMindmapsByShared(Long userId, boolean shared) {
        return mindmapParticipantRepository.findByUserIdAndSharedOrderByFavoriteAndUpdatedDesc(userId, shared).stream()
                .map(MindmapDetailRes::of).toList();
    }

    private List<MindmapDetailRes> getAllMindmap(Long userId) {
        return mindmapParticipantRepository.findByUserIdOrderByFavoriteAndUpdatedDesc(userId).stream()
                .map(MindmapDetailRes::of).toList();
    }


    @Transactional(readOnly = true)
    public List<MindmapNameRes> getMindmapList(Long userId) {
        return mindmapRepository.findByUserIdOrderByCreatedDesc(userId).stream().map(MindmapNameRes::of).toList();
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

    private UUID getUUID(String uuidStr) {
        try {
            return UUID.fromString(uuidStr);
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_MINDMAP_UUID);
        }
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
                } catch (NumberFormatException e) {
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
    public MindmapDetailRes updateFavoriteStatus(long userId, UUID mindmapId, boolean status) {
        MindmapParticipant participant = mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);
        participant.updateFavorite(status);

        return MindmapDetailRes.of(participant);
    }

    @Transactional
    public MindmapDetailRes updateName(long userId, UUID mindmapId, String name) {
        MindmapParticipant participant = mindmapAccessValidator.findParticipantOrThrow(mindmapId, userId);
        participant.getMindmap().updateName(name);

        return MindmapDetailRes.of(participant);
    }

    @Transactional
    public MindmapDetailRes saveMindmapParticipant(long userId, UUID mindmapId) {
        User user = userService.getUserOrThrow(userId);
        Mindmap mindmap = mindmapRepository.findByIdWithLock(mindmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.MINDMAP_NOT_FOUND));
        if (!mindmap.isShared()) throw new CustomException(ErrorCode.MINDMAP_ACCESS_FORBIDDEN);

        return mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, userId).map(MindmapDetailRes::of)
                .orElseGet(() -> {
                    MindmapParticipant newParticipant = new MindmapParticipant(user, mindmap);
                    MindmapParticipant savedParticipant = mindmapParticipantRepository.save(newParticipant);
                    return MindmapDetailRes.of(savedParticipant);
                });
    }

    @Transactional
    public String joinMindmapSession(long userId, UUID mindmapId) {
        userService.getUserOrThrow(userId);
        Mindmap mindmap = mindmapRepository.findByIdWithLock(mindmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.MINDMAP_NOT_FOUND));
        if (!mindmap.isShared()) throw new CustomException(ErrorCode.MINDMAP_ACCESS_FORBIDDEN);

        return snapshotRepository.createPresignedGetURL(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId));
    }
}
