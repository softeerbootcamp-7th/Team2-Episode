package com.yat2.episode.question;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.yat2.episode.competency.CompetencyType;
import com.yat2.episode.question.dto.QuestionSummary;
import com.yat2.episode.question.dto.QuestionsByCompetencyCategoryRes;
import com.yat2.episode.user.UserService;

@RequiredArgsConstructor
@Service
public class QuestionService {
    private final QuestionRepository questionRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<QuestionsByCompetencyCategoryRes> getQuestionSetByJobId(int jobId) {
        List<Question> questions = questionRepository.findAllWithCompetencyByJobId(jobId);

        Map<CompetencyType.Category, List<Question>> questionsByCategory =
                questions.stream().collect(Collectors.groupingBy(q -> q.getCompetencyType().getCategory()));

        return questionsByCategory.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(entry -> {
            CompetencyType.Category category = entry.getKey();
            List<QuestionSummary> questionDtos = entry.getValue().stream().map(QuestionSummary::of).toList();

            return new QuestionsByCompetencyCategoryRes(category, questionDtos);
        }).toList();
    }
}
