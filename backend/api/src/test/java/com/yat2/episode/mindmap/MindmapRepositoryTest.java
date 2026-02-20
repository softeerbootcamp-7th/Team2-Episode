package com.yat2.episode.mindmap;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.user.User;
import com.yat2.episode.user.UserRepository;
import com.yat2.episode.utils.AbstractRepositoryTest;

import static com.yat2.episode.utils.TestEntityFactory.createMindmap;
import static com.yat2.episode.utils.TestEntityFactory.createParticipant;
import static com.yat2.episode.utils.TestEntityFactory.createUser;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("MindmapRepository 통합 테스트")
class MindmapRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    MindmapRepository mindmapRepository;
    @Autowired
    UserRepository userRepository;
    @Autowired
    MindmapParticipantRepository participantRepository;

    @Test
    @DisplayName("사용자 ID로 참여 중인 마인드맵 목록을 최신순으로 조회한다")
    void findByUserIdOrderByLastJoinedDesc_Success() {
        User user = createUser(12345L);
        userRepository.save(user);

        Mindmap m1 = createMindmap("먼저 만든 마인드맵", false, LocalDateTime.now().minusSeconds(10));
        Mindmap m2 = createMindmap("나중에 만든 마인드맵", false, LocalDateTime.now());
        mindmapRepository.saveAll(List.of(m1, m2));

        participantRepository.save(createParticipant(m1, user));
        participantRepository.save(createParticipant(m2, user));

        List<Mindmap> result = mindmapRepository.findByUserIdOrderByLastJoinedDesc(12345L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("나중에 만든 마인드맵");
    }

    @Test
    @DisplayName("특정 이름을 접두사로 가진 사용자의 마인드맵 이름들을 모두 조회한다")
    void findAllNamesByBaseName_Success() {
        User user = createUser(1L);
        userRepository.save(user);

        String baseName = "애플의 마인드맵";
        Mindmap m1 = createMindmap(baseName, false);
        Mindmap m2 = createMindmap(baseName + "(1)", false);
        mindmapRepository.saveAll(List.of(m1, m2));

        participantRepository.save(createParticipant(m1, user));
        participantRepository.save(createParticipant(m2, user));

        List<String> names = mindmapRepository.findAllNamesByBaseName(baseName, 1L);

        assertThat(names).hasSize(2);
        assertThat(names).containsExactlyInAnyOrder(baseName, baseName + "(1)");
    }

    @Test
    @DisplayName("비관적 잠금을 적용하여 마인드맵을 조회한다")
    void findByIdWithLock_Success() {
        Mindmap mindmap = createMindmap("잠금 테스트", true);
        Mindmap saved = mindmapRepository.save(mindmap);
        UUID id = saved.getId();

        Optional<Mindmap> result = mindmapRepository.findByIdWithLock(id);

        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("잠금 테스트");
    }

}
