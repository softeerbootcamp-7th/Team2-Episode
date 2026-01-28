package com.yat2.episode.mindmap;

import com.yat2.episode.users.Users;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MindmapService {
    private final MindmapRepository mindmapRepository;
    private final MindmapParticipantRepository mindmapParticipantRepository;

    public MindmapService(MindmapRepository mindmapRepository, MindmapParticipantRepository mindmapParticipantRepository) {
        this.mindmapRepository = mindmapRepository;
        this.mindmapParticipantRepository = mindmapParticipantRepository;
    }

    public Optional<Mindmap> getMindmapById(String mindmapIdStr) {
        try {
            UUID mindmapId = UUID.fromString(mindmapIdStr);
            return mindmapRepository.findById(mindmapId);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public List<Mindmap> getPrivateMindmapById(Users user) {
        return mindmapRepository.findMindmapsByUserId(user.getKakaoId())
                .stream()
                .filter(mindmap -> !mindmap.isShared())
                .toList();
    }

}
