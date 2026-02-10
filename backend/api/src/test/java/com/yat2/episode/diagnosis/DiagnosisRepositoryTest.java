package com.yat2.episode.diagnosis;

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

import com.yat2.episode.competency.CompetencyType;
import com.yat2.episode.competency.CompetencyTypeRepository;
import com.yat2.episode.diagnosis.dto.DiagnosisSummaryDto;
import com.yat2.episode.job.Job;
import com.yat2.episode.job.JobRepository;
import com.yat2.episode.job.Occupation;
import com.yat2.episode.job.OccupationRepository;
import com.yat2.episode.question.Question;
import com.yat2.episode.question.QuestionRepository;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserRepository;

import static com.yat2.episode.utils.TestEntityFactory.createEntity;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("DiagnosisRepository 통합 테스트")
class DiagnosisRepositoryTest {

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
    private EntityManager em; // 영속성 컨텍스트 관리를 위해 추가

    @Test
    @DisplayName("사용자 ID로 진단 요약 목록을 DTO로 조회한다")
    void findDiagnosisSummariesByUserId_Success() {
        // 1. User 생성 및 저장
        User user = createEntity(User.class);
        ReflectionTestUtils.setField(user, "kakaoId", 123456789L);
        ReflectionTestUtils.setField(user, "nickname", "테스트유저");
        ReflectionTestUtils.setField(user, "hasWatchedFeatureGuide", false);
        userRepository.save(user);

        // 2. Occupation & Job 생성 (부모-자식 관계)
        Occupation occupation = new Occupation("개발"); // 엔티티 생성자 활용 추천
        occupationRepository.save(occupation);

        Job job = createEntity(Job.class);
        ReflectionTestUtils.setField(job, "name", "백엔드");
        ReflectionTestUtils.setField(job, "occupation", occupation);
        jobRepository.save(job);

        // 3. DiagnosisResult 생성 (User, Job 연관)
        DiagnosisResult dr = createEntity(DiagnosisResult.class);
        ReflectionTestUtils.setField(dr, "user", user);
        ReflectionTestUtils.setField(dr, "job", job);
        ReflectionTestUtils.setField(dr, "createdAt", LocalDateTime.now());
        diagnosisRepository.save(dr);

        CompetencyType competencyType = createEntity(CompetencyType.class);
        ReflectionTestUtils.setField(competencyType, "typeName", "의사소통");
        ReflectionTestUtils.setField(competencyType, "category", CompetencyType.Category.문제해결_사고_역량);
        competencyTypeRepository.save(competencyType);

        // 4. Weakness 및 Question 생성
        for (int i = 1; i <= 2; i++) {
            Question question = createEntity(Question.class);
            // JPA에서 ID는 직접 set하기보다 save 후 할당받는 것이 안전함
            ReflectionTestUtils.setField(question, "competencyType", competencyType);
            ReflectionTestUtils.setField(question, "content", "테스트 질문 내용 " + i);   // nullable = false
            ReflectionTestUtils.setField(question, "guidanceMessage", "가이드 메시지 " + i); // nullable = false
            questionRepository.save(question);

            DiagnosisWeakness weakness = createEntity(DiagnosisWeakness.class);
            ReflectionTestUtils.setField(weakness, "diagnosisResult", dr);
            ReflectionTestUtils.setField(weakness, "question", question);
            weaknessRepository.save(weakness);
        }

        // 영속성 컨텍스트를 비워 DB query가 실제로 나가는지 확인
        em.flush();
        em.clear();

        // When
        List<DiagnosisSummaryDto> summaries = diagnosisRepository.findDiagnosisSummariesByUserId(123456789L);

        // Then
        assertThat(summaries).isNotEmpty();
        // JPQL fetch join이나 count 쿼리가 정상 작동하는지 확인
        assertThat(summaries.get(0).weaknessCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("진단 ID와 사용자 ID로 상세 정보를 페치 조인 조회한다")
    void findDetailByIdAndUserId_Success() {
        // 1. User 생성 (필수 필드 포함)
        long kakaoId = 987654321L;
        User user = createEntity(User.class);
        ReflectionTestUtils.setField(user, "kakaoId", kakaoId);
        ReflectionTestUtils.setField(user, "nickname", "상세유저");
        ReflectionTestUtils.setField(user, "hasWatchedFeatureGuide", true);
        userRepository.save(user);

        // 2. Job 생성을 위한 Occupation 생성 및 저장
        Occupation occupation = new Occupation("기획");
        occupationRepository.save(occupation);

        // 3. Job 생성 및 필수 필드 세팅
        Job job = createEntity(Job.class);
        ReflectionTestUtils.setField(job, "name", "서비스 기획");
        ReflectionTestUtils.setField(job, "occupation", occupation);
        jobRepository.save(job);

        // 4. DiagnosisResult 생성 (User, Job 연관)
        DiagnosisResult dr = createEntity(DiagnosisResult.class);
        ReflectionTestUtils.setField(dr, "user", user);
        ReflectionTestUtils.setField(dr, "job", job);
        ReflectionTestUtils.setField(dr, "createdAt", LocalDateTime.now());
        diagnosisRepository.save(dr);

        // 영속성 컨텍스트 초기화 (실제 DB 조회 검증)
        em.flush();
        em.clear();

        // When
        Optional<DiagnosisResult> result = diagnosisRepository.findDetailByIdAndUserId(dr.getId(), kakaoId);

        // Then
        assertThat(result).isPresent();
        DiagnosisResult found = result.get();
        assertThat(found.getUser().getKakaoId()).isEqualTo(kakaoId);
        assertThat(found.getJob().getName()).isEqualTo("서비스 기획");
        assertThat(found.getJob().getOccupation().getName()).isEqualTo("기획");
    }
}
