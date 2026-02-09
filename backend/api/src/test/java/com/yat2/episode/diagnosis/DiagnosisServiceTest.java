package com.yat2.episode.diagnosis;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.yat2.episode.competency.CompetencyType;
import com.yat2.episode.diagnosis.dto.DiagnosisArgsReqDto;
import com.yat2.episode.diagnosis.dto.DiagnosisDetailDto;
import com.yat2.episode.diagnosis.dto.DiagnosisSummaryDto;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.job.Job;
import com.yat2.episode.job.JobRepository;
import com.yat2.episode.question.Question;
import com.yat2.episode.question.QuestionJobMappingRepository;
import com.yat2.episode.question.QuestionRepository;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("DiagnosisResultService 단위 테스트")
class DiagnosisServiceTest {

    @Mock
    private DiagnosisRepository diagnosisRepository;

    @Mock
    private DiagnosisWeaknessRepository diagnosisWeaknessRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private QuestionJobMappingRepository questionJobMappingRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private DiagnosisService diagnosisService;

    private User testUser;
    private Job testJob;

    @BeforeEach
    void setUp() {
        testJob = mock(Job.class);
        when(testJob.getName()).thenReturn("백엔드 개발자");
        when(testJob.getId()).thenReturn(10);

        testUser = User.newUser(123456789L, "테스트유저");
        testUser.updateJob(testJob);
    }

    @Nested
    @DisplayName("createDiagnosis")
    class CreateDiagnosisTest {

        @Test
        @DisplayName("진단 결과를 성공적으로 생성")
        void createDiagnosis_success() {
            Long userId = 1L;
            int jobId = 10;
            Set<Integer> questionIds = Set.of(1, 2, 3);
            DiagnosisArgsReqDto reqDto = new DiagnosisArgsReqDto(questionIds, jobId);

            Question question1 = mock(Question.class);
            Question question2 = mock(Question.class);
            Question question3 = mock(Question.class);
            List<Question> questions = List.of(question1, question2, question3);

            DiagnosisResult savedDiagnosis = mock(DiagnosisResult.class);
            when(savedDiagnosis.getId()).thenReturn(1);
            when(savedDiagnosis.getJob()).thenReturn(testJob);
            when(savedDiagnosis.getCreatedAt()).thenReturn(LocalDateTime.now());

            when(userService.getUserOrThrow(userId)).thenReturn(testUser);
            when(jobRepository.findById(jobId)).thenReturn(Optional.of(testJob));
            when(questionRepository.findAllById(questionIds)).thenReturn(questions);
            when(questionJobMappingRepository.countByJobIdAndQuestionIds(anyInt(), any())).thenReturn(
                    (long) questions.size());

            when(diagnosisRepository.save(any(DiagnosisResult.class))).thenReturn(savedDiagnosis);
            when(diagnosisWeaknessRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

            DiagnosisSummaryDto result = diagnosisService.createDiagnosis(userId, reqDto);

            assertThat(result).isNotNull();
            assertThat(result.diagnosisId()).isEqualTo(1);
            assertThat(result.jobName()).isEqualTo("백엔드 개발자");
            assertThat(result.weaknessCount()).isEqualTo(3);

            verify(userService).updateJob(userId, jobId);
            verify(diagnosisRepository).save(any(DiagnosisResult.class));
            verify(diagnosisWeaknessRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("존재하지 않는 질문 ID가 있으면 예외가 발생")
        void createDiagnosis_questionNotFound_throwsException() {
            Long userId = 1L;
            Integer jobId = 10;
            Set<Integer> questionIds = Set.of(1, 2, 999);
            DiagnosisArgsReqDto reqDto = new DiagnosisArgsReqDto(questionIds, jobId);

            Question question1 = mock(Question.class);
            Question question2 = mock(Question.class);
            List<Question> questions = List.of(question1, question2);

            when(userService.getUserOrThrow(userId)).thenReturn(testUser);
            when(questionRepository.findAllById(questionIds)).thenReturn(questions);
            when(jobRepository.findById(jobId)).thenReturn(Optional.of(testJob));
            when(questionJobMappingRepository.countByJobIdAndQuestionIds(anyInt(), any())).thenReturn(
                    (long) questions.size());


            assertThatThrownBy(() -> diagnosisService.createDiagnosis(userId, reqDto)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.QUESTION_NOT_FOUND);

            verify(diagnosisRepository, never()).save(any());
        }

        @Test
        @DisplayName("빈 질문 목록으로 진단 생성")
        void createDiagnosis_emptyQuestions_success() {
            Long userId = 1L;
            Integer jobId = 10;
            Set<Integer> questionIds = Set.of();
            DiagnosisArgsReqDto reqDto = new DiagnosisArgsReqDto(questionIds, jobId);

            DiagnosisResult savedDiagnosis = mock(DiagnosisResult.class);
            when(savedDiagnosis.getId()).thenReturn(1);
            when(savedDiagnosis.getJob()).thenReturn(testJob);
            when(savedDiagnosis.getCreatedAt()).thenReturn(LocalDateTime.now());

            when(userService.getUserOrThrow(userId)).thenReturn(testUser);
            when(questionRepository.findAllById(questionIds)).thenReturn(List.of());
            when(diagnosisRepository.save(any(DiagnosisResult.class))).thenReturn(savedDiagnosis);
            when(diagnosisWeaknessRepository.saveAll(anyList())).thenReturn(List.of());

            when(jobRepository.findById(jobId)).thenReturn(Optional.of(testJob));
            when(questionJobMappingRepository.countByJobIdAndQuestionIds(anyInt(), any())).thenReturn((long) 0);

            DiagnosisSummaryDto result = diagnosisService.createDiagnosis(userId, reqDto);

            assertThat(result).isNotNull();
            assertThat(result.weaknessCount()).isEqualTo(0);
        }

        @Test
        @DisplayName("존재하지 않는 직무 ID가 입력되면 JOB_NOT_FOUND 예외가 발생한다")
        void createDiagnosis_jobNotFound_throwsException() {
            Integer invalidJobId = 999;
            DiagnosisArgsReqDto reqDto = new DiagnosisArgsReqDto(Set.of(1), invalidJobId);

            when(userService.getUserOrThrow(anyLong())).thenReturn(testUser);
            when(jobRepository.findById(invalidJobId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> diagnosisService.createDiagnosis(1L, reqDto)).isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.JOB_NOT_FOUND);
        }

        @Test
        @DisplayName("질문이 선택한 직무와 매핑되지 않으면 INVALID_JOB 예외가 발생한다")
        void createDiagnosis_invalidMapping_throwsException() {
            Integer jobId = 10;
            DiagnosisArgsReqDto reqDto = new DiagnosisArgsReqDto(Set.of(1), jobId);

            when(userService.getUserOrThrow(anyLong())).thenReturn(testUser);
            when(jobRepository.findById(jobId)).thenReturn(Optional.of(testJob));
            when(questionRepository.findAllById(any())).thenReturn(List.of(mock(Question.class)));

            when(questionJobMappingRepository.countByJobIdAndQuestionIds(eq(jobId), anyList())).thenReturn(0L);

            assertThatThrownBy(() -> diagnosisService.createDiagnosis(1L, reqDto)).isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_JOB);
        }
    }

    @Nested
    @DisplayName("getDiagnosisSummariesByUserId")
    class GetDiagnosisSummariesByUserIdTest {

        @Test
        @DisplayName("사용자의 진단 요약 목록을 조회")
        void getDiagnosisSummaries_success() {
            Long userId = 1L;
            LocalDateTime now = LocalDateTime.now();
            List<DiagnosisSummaryDto> summaries = List.of(new DiagnosisSummaryDto(1, "백엔드 개발자", now, 5),
                                                          new DiagnosisSummaryDto(2, "프론트엔드 개발자", now.minusDays(1), 3));

            when(diagnosisRepository.findDiagnosisSummariesByUserId(userId)).thenReturn(summaries);

            List<DiagnosisSummaryDto> result = diagnosisService.getDiagnosisSummariesByUserId(userId);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).diagnosisId()).isEqualTo(1);
            assertThat(result.get(0).jobName()).isEqualTo("백엔드 개발자");
            assertThat(result.get(0).weaknessCount()).isEqualTo(5);
            assertThat(result.get(1).diagnosisId()).isEqualTo(2);

            verify(diagnosisRepository).findDiagnosisSummariesByUserId(userId);
        }

        @Test
        @DisplayName("진단 이력이 없으면 빈 목록을 반환")
        void getDiagnosisSummaries_empty() {
            Long userId = 1L;
            when(diagnosisRepository.findDiagnosisSummariesByUserId(userId)).thenReturn(List.of());

            List<DiagnosisSummaryDto> result = diagnosisService.getDiagnosisSummariesByUserId(userId);

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getDiagnosisDetailById")
    class GetDiagnosisDetailByIdTest {

        @Test
        @DisplayName("진단 상세 정보를 조회")
        void getDiagnosisDetail_success() {
            Integer diagnosisId = 1;
            Long userId = 1L;
            LocalDateTime createdAt = LocalDateTime.now();

            CompetencyType competencyType = mock(CompetencyType.class);
            when(competencyType.getCategory()).thenReturn(CompetencyType.Category.문제해결_사고_역량);
            when(competencyType.getTypeName()).thenReturn("문제분석력");
            when(competencyType.getId()).thenReturn(1);

            Question question = mock(Question.class);
            when(question.getId()).thenReturn(1);
            when(question.getContent()).thenReturn("테스트 질문");
            when(question.getGuidanceMessage()).thenReturn("가이드 메시지");
            when(question.getCompetencyType()).thenReturn(competencyType);

            DiagnosisResult diagnosis = mock(DiagnosisResult.class);
            DiagnosisWeakness weakness = mock(DiagnosisWeakness.class);

            when(diagnosis.getId()).thenReturn(diagnosisId);
            when(diagnosis.getJob()).thenReturn(testJob);
            when(diagnosis.getCreatedAt()).thenReturn(createdAt);
            when(diagnosis.getWeaknesses()).thenReturn(List.of(weakness));
            when(weakness.getQuestion()).thenReturn(question);

            when(diagnosisRepository.findDetailByIdAndUserId(diagnosisId, userId)).thenReturn(Optional.of(diagnosis));

            DiagnosisDetailDto result = diagnosisService.getDiagnosisDetailById(diagnosisId, userId);

            assertThat(result).isNotNull();
            assertThat(result.diagnosisId()).isEqualTo(diagnosisId);
            assertThat(result.jobName()).isEqualTo("백엔드 개발자");
            assertThat(result.createdAt()).isEqualTo(createdAt);
            assertThat(result.weaknesses()).hasSize(1);
            assertThat(result.weaknesses().get(0).question()).isEqualTo("테스트 질문");
        }

        @Test
        @DisplayName("존재하지 않는 진단 결과를 조회하면 예외가 발생")
        void getDiagnosisDetail_notFound_throwsException() {
            Integer diagnosisId = 999;
            Long userId = 1L;

            when(diagnosisRepository.findDetailByIdAndUserId(diagnosisId, userId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> diagnosisService.getDiagnosisDetailById(diagnosisId, userId)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.DIAGNOSIS_NOT_FOUND);
        }

        @Test
        @DisplayName("다른 사용자의 진단 결과를 조회하면 예외가 발생")
        void getDiagnosisDetail_wrongUser_throwsException() {
            Integer diagnosisId = 1;
            Long wrongUserId = 999L;

            when(diagnosisRepository.findDetailByIdAndUserId(diagnosisId, wrongUserId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> diagnosisService.getDiagnosisDetailById(diagnosisId, wrongUserId)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.DIAGNOSIS_NOT_FOUND);
        }

        @Test
        @DisplayName("약점이 없는 진단의 상세 정보를 조회")
        void getDiagnosisDetail_noWeaknesses() {
            Integer diagnosisId = 1;
            Long userId = 1L;
            LocalDateTime createdAt = LocalDateTime.now();

            DiagnosisResult diagnosis = mock(DiagnosisResult.class);
            when(diagnosis.getId()).thenReturn(diagnosisId);
            when(diagnosis.getJob()).thenReturn(testJob);
            when(diagnosis.getCreatedAt()).thenReturn(createdAt);
            when(diagnosis.getWeaknesses()).thenReturn(List.of());

            when(diagnosisRepository.findDetailByIdAndUserId(diagnosisId, userId)).thenReturn(Optional.of(diagnosis));

            DiagnosisDetailDto result = diagnosisService.getDiagnosisDetailById(diagnosisId, userId);

            assertThat(result).isNotNull();
            assertThat(result.weaknesses()).isEmpty();
        }
    }
}
