package com.yat2.episode.question;

import com.yat2.episode.competency.CompetencyType;
import com.yat2.episode.competency.CompetencyTypeRepository;
import com.yat2.episode.job.Job;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.yat2.episode.utils.TestEntityFactory.createEntity;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("local")
@DisplayName("QuestionRepository 통합 테스트")
class QuestionRepositoryTest {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CompetencyTypeRepository competencyTypeRepository;

    @Autowired
    private QuestionJobMappingRepository mappingRepository;

    @Test
    @DisplayName("특정 직무 ID에 매핑된 질문들만 역량 타입과 함께 조회한다")
    void findAllWithCompetencyByJobId_Success() {
        CompetencyType ct = createEntity(CompetencyType.class);
        ReflectionTestUtils.setField(ct, "typeName", "테스트 역량");
        ReflectionTestUtils.setField(ct, "category", CompetencyType.Category.협업_커뮤니케이션_역량);
        competencyTypeRepository.save(ct);

        int existingJobId = 1;
        Job fakeJob = createEntity(Job.class);
        ReflectionTestUtils.setField(fakeJob, "id", existingJobId);

        String uniqueContent = "테스트 질문 " + UUID.randomUUID();
        Question q = createEntity(Question.class);
        ReflectionTestUtils.setField(q, "competencyType", ct);
        ReflectionTestUtils.setField(q, "content", uniqueContent);
        ReflectionTestUtils.setField(q, "guidanceMessage", "가이드");
        questionRepository.save(q);

        QuestionJobMapping mapping = createEntity(QuestionJobMapping.class);
        ReflectionTestUtils.setField(mapping, "job", fakeJob);
        ReflectionTestUtils.setField(mapping, "question", q);
        mappingRepository.save(mapping);

        List<Question> result = questionRepository.findAllWithCompetencyByJobId(existingJobId);

        assertThat(result)
                .extracting(Question::getContent)
                .contains(uniqueContent);
    }

    @Test
    @DisplayName("모든 질문을 역량 타입과 함께 페치 조인으로 조회한다")
    void findAllWithCompetency_Success() {
        CompetencyType ct = createEntity(CompetencyType.class);
        ReflectionTestUtils.setField(ct, "typeName", "페치조인 테스트");
        ReflectionTestUtils.setField(ct, "category", CompetencyType.Category.문제해결_사고_역량);
        competencyTypeRepository.save(ct);

        String uniqueContent = "유니크 질문 " + UUID.randomUUID();
        Question q = createEntity(Question.class);
        ReflectionTestUtils.setField(q, "competencyType", ct);
        ReflectionTestUtils.setField(q, "content", uniqueContent);
        ReflectionTestUtils.setField(q, "guidanceMessage", "가이드");
        questionRepository.save(q);

        List<Question> result = questionRepository.findAllWithCompetency();

        assertThat(result)
                .extracting(Question::getContent)
                .contains(uniqueContent);
    }
}