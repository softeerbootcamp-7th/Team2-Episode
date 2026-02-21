package com.yat2.episode.episode;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.yat2.episode.episode.dto.response.EpisodeSummaryRes;
import com.yat2.episode.mindmap.Mindmap;
import com.yat2.episode.utils.AbstractRepositoryTest;

import static com.yat2.episode.utils.TestEntityFactory.createEpisode;
import static com.yat2.episode.utils.TestEntityFactory.createEpisodeStar;
import static com.yat2.episode.utils.TestEntityFactory.createMindmap;
import static com.yat2.episode.utils.TestEntityFactory.createUser;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("EpisodeRepository 통합 테스트")
class EpisodeRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    EpisodeRepository episodeRepository;
    @Autowired
    EpisodeStarRepository episodeStarRepository;
    @Autowired
    EntityManager em;

    @Test
    @DisplayName("mindmapId로 nodeId 목록 조회")
    void findNodeIdsByMindmapId() {
        Mindmap m1 = createMindmap("mm-1");
        Mindmap mOther = createMindmap("mm-other");
        em.persist(m1);
        em.persist(mOther);

        UUID node1 = UUID.randomUUID();
        UUID node2 = UUID.randomUUID();

        em.persist(createEpisode(node1, m1.getId(), "c1"));
        em.persist(createEpisode(node2, m1.getId(), "c2"));
        em.persist(createEpisode(UUID.randomUUID(), mOther.getId(), "other"));

        flushAndClear();

        List<UUID> ids = episodeRepository.findNodeIdsByMindmapId(m1.getId());

        assertThat(ids).containsExactlyInAnyOrder(node1, node2);
    }

    @Test
    @DisplayName("요약 리스트 조회")
    void findSummariesByMindmapIdAndUserId() {
        Mindmap m1 = createMindmap("mm-1");
        em.persist(m1);

        long userId = 100L;
        em.persist(createUser(userId));

        UUID node1 = UUID.randomUUID();
        UUID node2 = UUID.randomUUID();

        em.persist(createEpisode(node1, m1.getId(), "content1"));
        em.persist(createEpisode(node2, m1.getId(), "content2"));

        em.persist(createEpisodeStar(node1, userId, Set.of(1, 2)));
        em.persist(createEpisodeStar(node2, userId, Set.of(2, 3)));

        flushAndClear();

        List<EpisodeSummaryRes> summaries = episodeRepository.findSummariesByMindmapIdAndUserId(m1.getId(), userId);

        assertThat(summaries).hasSize(2);
        assertThat(summaries).extracting(EpisodeSummaryRes::nodeId).containsExactlyInAnyOrder(node1, node2);
    }

    @Test
    @DisplayName("에피소드 상세 조회 (Star fetch)")
    void findStarDetail() {
        Mindmap m1 = createMindmap("mm-1");
        em.persist(m1);

        long userId = 100L;
        em.persist(createUser(userId));

        UUID node = UUID.randomUUID();
        em.persist(createEpisode(node, m1.getId(), "content"));
        em.persist(createEpisodeStar(node, userId, Set.of(7, 8)));

        flushAndClear();

        Optional<EpisodeStar> opt = episodeStarRepository.findStarDetail(node, userId);

        assertThat(opt).isPresent();
        assertThat(opt.get().getEpisode().getId()).isEqualTo(node);
        assertThat(opt.get().getCompetencyTypeIds()).containsExactlyInAnyOrder(7, 8);
        assertThat(opt.get().getEpisode().getMindmapId()).isEqualTo(m1.getId());
    }

    @Test
    @DisplayName("Mindmap에 속한 competencyTypeIds 중복 제거 조회 (user별)")
    void findCompetencyTypesByMindmapId() {
        Mindmap m1 = createMindmap("mm-1");
        em.persist(m1);

        long userA = 100L;
        long userB = 200L;
        em.persist(createUser(userA));
        em.persist(createUser(userB));

        UUID node1 = UUID.randomUUID();
        UUID node2 = UUID.randomUUID();

        em.persist(createEpisode(node1, m1.getId(), "c1"));
        em.persist(createEpisode(node2, m1.getId(), "c2"));

        em.persist(createEpisodeStar(node1, userA, Set.of(1, 2, 3)));
        em.persist(createEpisodeStar(node2, userB, Set.of(2, 3, 4)));

        flushAndClear();

        List<Integer> ids = episodeStarRepository.findCompetencyTypesByMindmapId(m1.getId(), userA);

        assertThat(ids).containsExactlyInAnyOrder(1, 2, 3);
    }

    private void flushAndClear() {
        em.flush();
        em.clear();
    }
}
