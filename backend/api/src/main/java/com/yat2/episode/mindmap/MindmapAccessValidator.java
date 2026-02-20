package com.yat2.episode.mindmap;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;

@Component
@RequiredArgsConstructor
public class MindmapAccessValidator {

    private final MindmapParticipantRepository mindmapParticipantRepository;
    private final MindmapRepository mindmapRepository;

    public MindmapParticipant findUserInParticipantsOrThrow(List<MindmapParticipant> participants, long userId) {
        MindmapParticipant mindmapParticipant = null;
        for (MindmapParticipant participant : participants) {
            if (participant.getUser().getKakaoId() == userId) mindmapParticipant = participant;
        }
        if (mindmapParticipant == null) throw new CustomException(ErrorCode.MINDMAP_NOT_FOUND);
        return mindmapParticipant;
    }

    public MindmapParticipant findParticipantOrThrow(UUID mindmapId, long userId) {
        return mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.MINDMAP_PARTICIPANT_NOT_FOUND));
    }

    public Mindmap findMindmapOrThrow(UUID mindmapId) {
        Mindmap mindmap = mindmapRepository.findById(mindmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.MINDMAP_NOT_FOUND));
        return mindmap;
    }

    public Mindmap validateTeamMindmap(UUID mindmapId) {
        Mindmap mindmap = mindmapRepository.findByIdWithLock(mindmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.MINDMAP_NOT_FOUND));
        if (!mindmap.isShared()) throw new CustomException(ErrorCode.MINDMAP_ACCESS_FORBIDDEN);

        return mindmap;
    }
}
