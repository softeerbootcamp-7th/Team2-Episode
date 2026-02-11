package com.yat2.episode.diagnosis;

import com.yat2.episode.competency.CompetencyType;
import com.yat2.episode.competency.CompetencyTypeRepository;
import com.yat2.episode.diagnosis.dto.DiagnosisSummaryRes;
import com.yat2.episode.job.Job;
import com.yat2.episode.job.JobRepository;
import com.yat2.episode.job.Occupation;
import com.yat2.episode.job.OccupationRepository;
import com.yat2.episode.question.Question;
import com.yat2.episode.question.QuestionRepository;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserRepository;
import com.yat2.episode.utils.AbstractRepositoryTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static com.yat2.episode.utils.TestEntityFactory.createEntity;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("DiagnosisRepository 통합 테스트")
class DiagnosisRepositoryTest extends AbstractRepositoryTest {
    @Autowired
    private DiagnosisRepository diagnosisRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private DiagnosisWeaknessRepository weaknessRepository;
    @Autowired
    private JobRepository jobRepository;
    @Autowired
    private OccupationRepository occupationRepository;
    @Autowired
    private QuestionRepository questionRepository;
    @Autowired
    private CompetencyTypeRepository competencyTypeRepository;
    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("사용자 ID로 진단 요약 목록을 DTO로 조회한다")
    void findDiagnosisSummariesByUserId_Success() {
        User user = createEntity(User.class);
        ReflectionTestUtils.setField(user, "kakaoId", 123456789L);
        ReflectionTestUtils.setField(user, "nickname", "테스트유저");
        ReflectionTestUtils.setField(user, "hasWatchedFeatureGuide", false);
        userRepository.save(user);

        Occupation occupation = new Occupation("개발");
        occupationRepository.save(occupation);

        Job job = createEntity(Job.class);
        ReflectionTestUtils.setField(job, "name", "백엔드");
        ReflectionTestUtils.setField(job, "occupation", occupation);
        jobRepository.save(job);

        DiagnosisResult dr = createEntity(DiagnosisResult.class);
        ReflectionTestUtils.setField(dr, "user", user);
        ReflectionTestUtils.setField(dr, "job", job);
        ReflectionTestUtils.setField(dr, "createdAt", LocalDateTime.now());
        diagnosisRepository.save(dr);

        CompetencyType competencyType = createEntity(CompetencyType.class);
        ReflectionTestUtils.setField(competencyType, "typeName", "의사소통");
        ReflectionTestUtils.setField(competencyType, "category", CompetencyType.Category.문제해결_사고_역량);
        competencyTypeRepository.save(competencyType);

        for (int i = 1; i <= 2; i++) {
            Question question = createEntity(Question.class);
            ReflectionTestUtils.setField(question, "competencyType", competencyType);
            ReflectionTestUtils.setField(question, "content", "테스트 질문 내용 " + i);
            ReflectionTestUtils.setField(question, "guidanceMessage", "가이드 메시지 " + i);
            questionRepository.save(question);

            DiagnosisWeakness weakness = createEntity(DiagnosisWeakness.class);
            ReflectionTestUtils.setField(weakness, "diagnosisResult", dr);
            ReflectionTestUtils.setField(weakness, "question", question);
            weaknessRepository.save(weakness);
        }

        em.flush();
        em.clear();

        List<DiagnosisSummaryRes> summaries = diagnosisRepository.findDiagnosisSummariesByUserId(123456789L);

        assertThat(summaries).isNotEmpty();
        assertThat(summaries.get(0).weaknessCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("진단 ID와 사용자 ID로 상세 정보를 페치 조인 조회한다")
    void findDetailByIdAndUserId_Success() {
        long kakaoId = 987654321L;
        User user = createEntity(User.class);
        ReflectionTestUtils.setField(user, "kakaoId", kakaoId);
        ReflectionTestUtils.setField(user, "nickname", "상세유저");
        ReflectionTestUtils.setField(user, "hasWatchedFeatureGuide", true);
        userRepository.save(user);

        Occupation occupation = new Occupation("기획");
        occupationRepository.save(occupation);

        Job job = createEntity(Job.class);
        ReflectionTestUtils.setField(job, "name", "서비스 기획");
        ReflectionTestUtils.setField(job, "occupation", occupation);
        jobRepository.save(job);

        DiagnosisResult dr = createEntity(DiagnosisResult.class);
        ReflectionTestUtils.setField(dr, "user", user);
        ReflectionTestUtils.setField(dr, "job", job);
        ReflectionTestUtils.setField(dr, "createdAt", LocalDateTime.now());
        diagnosisRepository.save(dr);

        em.flush();
        em.clear();

        Optional<DiagnosisResult> result = diagnosisRepository.findDetailByIdAndUserId(dr.getId(), kakaoId);

        assertThat(result).isPresent();
        DiagnosisResult found = result.get();
        assertThat(found.getUser().getKakaoId()).isEqualTo(kakaoId);
        assertThat(found.getJob().getName()).isEqualTo("서비스 기획");
        assertThat(found.getJob().getOccupation().getName()).isEqualTo("기획");
    }
}
