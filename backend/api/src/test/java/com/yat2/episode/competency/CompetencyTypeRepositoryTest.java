package com.yat2.episode.competency;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class CompetencyTypeRepositoryTest {

    @Autowired
    private CompetencyTypeRepository competencyTypeRepository;

    private CompetencyType createCompetency(String name) {
        CompetencyType type = new CompetencyType();
        ReflectionTestUtils.setField(type, "typeName", name);
        ReflectionTestUtils.setField(type, "category", CompetencyType.Category.문제해결_사고_역량);
        return competencyTypeRepository.save(type);
    }

    @Test
    @DisplayName("id 목록에 해당하는 CompetencyType 개수를 반환한다")
    void countByIdIn_success() {

        CompetencyType t1 = createCompetency("문제 해결");
        CompetencyType t2 = createCompetency("협업");
        CompetencyType t3 = createCompetency("커뮤니케이션");

        competencyTypeRepository.flush();

        long count = competencyTypeRepository.countByIdIn(Set.of(t1.getId(), t2.getId()));

        assertThat(count).isEqualTo(2);
    }

    @Test
    @DisplayName("존재하지 않는 id만 전달하면 0을 반환한다")
    void countByIdIn_empty() {

        createCompetency("리더십");
        competencyTypeRepository.flush();

        long count = competencyTypeRepository.countByIdIn(Set.of(999, 1000));

        assertThat(count).isZero();
    }
}
