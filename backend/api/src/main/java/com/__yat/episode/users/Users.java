package com.__yat.episode.users;

import com.__yat.episode.diagnosis.DiagnosisResult;
import com.__yat.episode.episode.Episode;
import com.__yat.episode.job.Job;
import com.__yat.episode.mindmap.User2Mindmap;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Getter
@Setter
@Table(name = "users")
public class Users {

    @Id
    @Column(name = "kakao_id")
    private Long kakaoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(nullable = false, length = 45)
    private String nickname;

    @Column(name = "has_watched_feature_guide", nullable = false)
    private Boolean hasWatchedFeatureGuide;
}
