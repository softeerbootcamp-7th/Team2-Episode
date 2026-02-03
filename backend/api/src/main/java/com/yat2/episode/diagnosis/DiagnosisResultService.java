package com.yat2.episode.diagnosis;

import com.yat2.episode.diagnosis.dto.DiagnosisArgsReqDto;
import com.yat2.episode.diagnosis.dto.DiagnosisSimpleDto;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.question.Question;
import com.yat2.episode.question.QuestionRepository;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Transactional(readOnly = true)
@RequiredArgsConstructor
@Service
public class DiagnosisResultService {
    private final DiagnosisResultRepository diagnosisResultRepository;
    private final DiagnosisWeaknessRepository diagnosisWeaknessRepository;
    private final QuestionRepository questionRepository;
    private final UserService userService;

    @Transactional
    public DiagnosisSimpleDto createDiagnosis(Long userId, DiagnosisArgsReqDto reqDto) {
        User user = userService.getUserOrThrow(userId);
        validateUserJob(user);

        List<Question> questions = questionRepository.findAllById(reqDto.unansweredQuestionIds());
        if (questions.size() != reqDto.unansweredQuestionIds().size()) {
            throw new CustomException(ErrorCode.QUESTION_NOT_FOUND);
        }

        DiagnosisResult diagnosisResult =
                diagnosisResultRepository.save(DiagnosisResult.newDiagnosis(user, user.getJob()));

        List<DiagnosisWeakness> weaknesses =
                questions.stream().map(q -> DiagnosisWeakness.newDiagnosisWeakness(diagnosisResult, q)).toList();
        diagnosisWeaknessRepository.saveAll(weaknesses);

        return DiagnosisSimpleDto.of(diagnosisResult, weaknesses.size());
    }

    private void validateUserJob(User user) {
        if (user.getJob() == null) {
            throw new CustomException(ErrorCode.JOB_NOT_SELECTED);
        }
    }
}
