package com.yat2.episode.episode;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.competency.CompetencyType;
import com.yat2.episode.competency.CompetencyTypeRepository;

import static com.yat2.episode.utils.TestEntityFactory.createEntity;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("EpisodeRepository 테스트")
class EpisodeRepositoryTest {

    @Autowired
    private EpisodeRepository episodeRepository;

    @Autowired
    private CompetencyTypeRepository competencyTypeRepository;

    @Autowired
    private EntityManager em;

    private UUID mindmapId;
    private long userId;
    private UUID nodeId1;
    private UUID nodeId2;

    @BeforeEach
    void setUp() {
        mindmapId = UUID.randomUUID();
        userId = 1L;
        nodeId1 = UUID.randomUUID();
        nodeId2 = UUID.randomUUID();

        for (int i = 1; i <= 5; i++) {
            CompetencyType competencyType = createEntity(CompetencyType.class);
            ReflectionTestUtils.setField(competencyType, "typeName", "역량 " + i);
            ReflectionTestUtils.setField(competencyType, "category", CompetencyType.Category.문제해결_사고_역량);
            competencyTypeRepository.save(competencyType);
        }
    }

    private Episode createEpisode(UUID nodeId, long userId, UUID mindmapId) {
        Episode episode = Episode.create(nodeId, userId, mindmapId);
        ReflectionTestUtils.setField(episode, "content", "기본 에피소드 내용");
        ReflectionTestUtils.setField(episode, "updatedAtContent", LocalDateTime.now().minusDays(1));
        return episode;
    }

    @Nested
    @DisplayName("findByMindmapIdAndIdUserId")
    class FindByMindmapIdAndIdUserId {
        @Test
        @DisplayName("특정 마인드맵 ID와 사용자 ID에 해당하는 모든 에피소드를 조회한다")
        void should_find_episodes_by_mindmapId_and_userId() {
            Episode ep1 = createEpisode(nodeId1, userId, mindmapId);
            Episode ep2 = createEpisode(nodeId2, userId, mindmapId);
            Episode otherUserEp = createEpisode(nodeId1, 999L, mindmapId); // 다른 유저
            episodeRepository.saveAll(List.of(ep1, ep2, otherUserEp));

            List<Episode> result = episodeRepository.findByMindmapIdAndIdUserId(mindmapId, userId);

            assertThat(result).hasSize(2);
            assertThat(result).extracting("id.userId").containsOnly(userId);
        }
    }

    @Nested
    @DisplayName("updateContentIfNewer")
    class UpdateContentIfNewer {
        @Test
        @DisplayName("성공: 클라이언트 시간이 더 최신이면 해당 노드의 모든 유저 에피소드 내용을 업데이트한다")
        void should_update_content_when_client_time_is_newer() {
            LocalDateTime oldTime = LocalDateTime.of(2026, 1, 1, 10, 0, 0);
            LocalDateTime clientTime = LocalDateTime.of(2026, 2, 11, 15, 0, 0);

            Episode user1Ep = createEpisode(nodeId1, 1L, mindmapId);
            Episode user2Ep = createEpisode(nodeId1, 2L, mindmapId);

            episodeRepository.saveAll(List.of(user1Ep, user2Ep));

            ReflectionTestUtils.setField(user1Ep, "updatedAtContent", oldTime);
            ReflectionTestUtils.setField(user2Ep, "updatedAtContent", oldTime);

            em.flush();
            em.clear();

            String newContent = "최신화된 내용";
            int updatedCount = episodeRepository.updateContentIfNewer(nodeId1, newContent, clientTime);

            assertThat(updatedCount).isEqualTo(2);
            Episode updated = episodeRepository.findById(new EpisodeId(nodeId1, 1L)).orElseThrow();
            assertThat(updated.getContent()).isEqualTo(newContent);
            assertThat(updated.getUpdatedAtContent()).isEqualTo(clientTime);
        }

        @Test
        @DisplayName("실패: 클라이언트 시간이 기존 데이터보다 이전이면 업데이트를 수행하지 않는다")
        void should_not_update_when_client_time_is_older() {
            LocalDateTime latestTime = LocalDateTime.of(2026, 2, 11, 15, 0);
            LocalDateTime oldClientTime = LocalDateTime.of(2026, 2, 11, 14, 0);

            Episode user1Ep = createEpisode(nodeId1, 1L, mindmapId);
            ReflectionTestUtils.setField(user1Ep, "updatedAtContent", latestTime);

            episodeRepository.save(user1Ep);
            em.flush();
            em.clear();

            int updatedCount = episodeRepository.updateContentIfNewer(nodeId1, "과거 내용", oldClientTime);

            assertThat(updatedCount).isZero();

            Episode notUpdated = episodeRepository.findById(new EpisodeId(nodeId1, 1L)).orElseThrow();
            assertThat(notUpdated.getUpdatedAtContent()).isEqualTo(latestTime);
            assertThat(notUpdated.getContent()).isNotEqualTo("과거 내용");
        }
    }
}
