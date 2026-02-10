package com.yat2.episode.question;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

@Repository
public interface QuestionJobMappingRepository extends JpaRepository<QuestionJobMapping, Integer> {
    long countByJob_IdAndQuestion_IdIn(Integer jobId, List<Integer> questionIds);
}