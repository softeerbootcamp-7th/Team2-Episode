package com.yat2.episode.question;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuestionJobMappingRepository extends JpaRepository<QuestionJobMapping, Integer> {
    @Query(
            value = "SELECT COUNT(*) FROM question_job_mappings qjm " + "WHERE qjm.job_id = :jobId " +
                    "AND qjm.question_id IN (:questionIds)"
    )
    long countByJobIdAndQuestionIds(
            @Param("jobId") Integer jobId,
            @Param("questionIds") List<Integer> questionIds
    );
}
