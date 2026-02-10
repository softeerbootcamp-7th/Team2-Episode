package com.yat2.episode.mindmap;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;

@Component
@RequiredArgsConstructor
public class MindmapAccessValidator {

    private final MindmapParticipantRepository mindmapParticipantRepository;

    public MindmapParticipant findParticipantOrThrow(UUID mindmapId, long userId) {
        return mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.MINDMAP_NOT_FOUND));
    }
}
