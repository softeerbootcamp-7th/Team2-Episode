package com.__yat.episode.diagnosis;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "diagnosis_result")
public class DiagnosisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "job_id", nullable = false)
    private Integer jobId;

    protected DiagnosisResult() {
    }

    public DiagnosisResult(Long userId, Integer jobId) {
        this.userId = userId;
        this.jobId = jobId;
    }
}