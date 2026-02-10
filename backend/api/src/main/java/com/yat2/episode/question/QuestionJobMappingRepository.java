package com.yat2.episode.question;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionJobMappingRepository extends JpaRepository<QuestionJobMapping, Integer> {
    long countByJob_IdAndQuestion_IdIn(Integer jobId, List<Integer> questionIds);
}
