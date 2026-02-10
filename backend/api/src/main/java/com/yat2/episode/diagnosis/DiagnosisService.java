package com.yat2.episode.diagnosis;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.yat2.episode.diagnosis.dto.DiagnosisCreateReq;
import com.yat2.episode.diagnosis.dto.DiagnosisDetailRes;
import com.yat2.episode.diagnosis.dto.DiagnosisSummaryRes;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.job.Job;
import com.yat2.episode.job.JobRepository;
import com.yat2.episode.question.Question;
import com.yat2.episode.question.QuestionJobMappingRepository;
import com.yat2.episode.question.QuestionRepository;
import com.yat2.episode.question.dto.QuestionDetail;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserService;

@Transactional(readOnly = true)
@RequiredArgsConstructor
@Service
public class DiagnosisService {
    private final DiagnosisRepository diagnosisRepository;
    private final DiagnosisWeaknessRepository diagnosisWeaknessRepository;
    private final QuestionRepository questionRepository;
    private final JobRepository jobRepository;
    private final QuestionJobMappingRepository questionJobMappingRepository;
    private final UserService userService;

    @Transactional
    public DiagnosisSummaryRes createDiagnosis(Long userId, DiagnosisCreateReq reqDto) {
        User user = userService.getUserOrThrow(userId);
        Job job =
                jobRepository.findById(reqDto.jobId()).orElseThrow(() -> new CustomException(ErrorCode.JOB_NOT_FOUND));

        List<Question> questions = questionRepository.findAllById(reqDto.unansweredQuestionIds());
        if (questions.size() != reqDto.unansweredQuestionIds().size()) {
            throw new CustomException(ErrorCode.QUESTION_NOT_FOUND);
        }
        if (questionJobMappingRepository.countByJob_IdAndQuestion_IdIn(job.getId(),
                                                                       reqDto.unansweredQuestionIds().stream()
                                                                               .toList()) != questions.size()) {
            throw new CustomException(ErrorCode.INVALID_JOB);
        }

        DiagnosisResult diagnosisResult = diagnosisRepository.save(new DiagnosisResult(user, job));

        List<DiagnosisWeakness> weaknesses =
                questions.stream().map(q -> new DiagnosisWeakness(diagnosisResult, q)).toList();
        diagnosisWeaknessRepository.saveAll(weaknesses);

        user.updateJob(job);
        //todo: save-all을 통한 개별 쿼리에서 bulk 방식으로 개선

        return DiagnosisSummaryRes.of(diagnosisResult, weaknesses.size());
    }

    public List<DiagnosisSummaryRes> getDiagnosisSummariesByUserId(Long userId) {
        return diagnosisRepository.findDiagnosisSummariesByUserId(userId);
    }

    public DiagnosisDetailRes getDiagnosisDetailById(Integer diagnosisId, Long userId) {
        DiagnosisResult diagnosis = diagnosisRepository.findDetailByIdAndUserId(diagnosisId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.DIAGNOSIS_NOT_FOUND));

        List<QuestionDetail> weaknesses =
                diagnosis.getWeaknesses().stream().map(DiagnosisWeakness::getQuestion).map(QuestionDetail::of).toList();

        return new DiagnosisDetailRes(diagnosis.getId(), diagnosis.getJob().getName(), diagnosis.getCreatedAt(),
                                      weaknesses);
    }

    private void validateUserJob(User user) {
        if (user.getJob() == null) {
            throw new CustomException(ErrorCode.JOB_NOT_SELECTED);
        }
    }
}
