package com.yat2.episode.question;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.yat2.episode.competency.CompetencyType;
import com.yat2.episode.question.dto.QuestionSummaryDto;
import com.yat2.episode.question.dto.QuestionsByCompetencyCategoryDto;
import com.yat2.episode.user.UserService;

@RequiredArgsConstructor
@Service
public class QuestionService {
    private final QuestionRepository questionRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<QuestionsByCompetencyCategoryDto> getQuestionSetByJobId(int jobId) {
        List<Question> questions = questionRepository.findAllWithCompetencyByJobId(jobId);

        Map<CompetencyType.Category, List<Question>> questionsByCategory =
                questions.stream().collect(Collectors.groupingBy(q -> q.getCompetencyType().getCategory()));

        return questionsByCategory.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(entry -> {
            CompetencyType.Category category = entry.getKey();
            List<QuestionSummaryDto> questionDtos = entry.getValue().stream().map(QuestionSummaryDto::of).toList();

            return new QuestionsByCompetencyCategoryDto(category, questionDtos);
        }).toList();
    }
}
