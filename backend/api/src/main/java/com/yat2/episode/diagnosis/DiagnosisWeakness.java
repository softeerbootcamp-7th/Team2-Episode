package com.yat2.episode.diagnosis;

import com.yat2.episode.question.Question;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "diagnosis_weakness")
public class DiagnosisWeakness {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diagnosis_result_id", nullable = false)
    private DiagnosisResult diagnosisResult;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    public DiagnosisWeakness(DiagnosisResult diagnosisResult, Question question) {
        this.diagnosisResult = diagnosisResult;
        this.question = question;
    }
}
