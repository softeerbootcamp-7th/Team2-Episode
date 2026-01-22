package com.__yat.episode.job;

import com.__yat.episode.diagnosis.DiagnosisResult;
import com.__yat.episode.occupation.Occupation;
import com.__yat.episode.question.Question;
import com.__yat.episode.users.Users;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Getter
@Setter
@Table(name = "job")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false, length = 15)
    private String name;

    @ManyToOne
    @JoinColumn(name = "occupation_id", nullable = false)
    private Occupation occupation;

    @OneToMany(mappedBy = "job")
    private List<Users> users;

    @OneToMany(mappedBy = "job")
    private List<DiagnosisResult> diagnosisResults;

    @OneToMany(mappedBy = "job")
    private List<Question> questions;
}
