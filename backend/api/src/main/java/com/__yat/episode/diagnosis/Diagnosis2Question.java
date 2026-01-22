package com.__yat.episode.diagnosis;

import com.__yat.episode.question.Question;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "diagnosis2question")
public class Diagnosis2Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "diagnosis_result_id", nullable = false)
    private DiagnosisResult diagnosisResult;

    @ManyToOne
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;
}
