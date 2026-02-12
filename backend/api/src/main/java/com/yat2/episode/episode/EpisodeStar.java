package com.yat2.episode.episode;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeUpsertReq;
import com.yat2.episode.episode.dto.StarUpdateReq;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "episode_stars")
public class EpisodeStar {

    @EmbeddedId
    private EpisodeId id;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(
            name = "competency_type_ids", columnDefinition = "json", nullable = false
    )
    private List<Integer> competencyTypeIds = new ArrayList<>();

    @Column(length = 200)
    private String situation;

    @Column(length = 200)
    private String task;

    @Column(length = 200)
    private String action;

    @Column(length = 200)
    private String result;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static EpisodeStar create(UUID nodeId, long userId) {
        EpisodeStar episodeStar = new EpisodeStar();
        episodeStar.id = new EpisodeId(nodeId, userId);
        return episodeStar;
    }

    public void update(EpisodeUpsertReq req) {
        if (req.situation() != null) this.situation = req.situation();
        if (req.task() != null) this.task = req.task();
        if (req.action() != null) this.action = req.action();
        if (req.result() != null) this.result = req.result();
        if (req.startDate() != null) this.startDate = req.startDate();
        if (req.endDate() != null) this.endDate = req.endDate();

        if (req.competencyTypeIds() != null) {
            this.competencyTypeIds.clear();
            this.competencyTypeIds.addAll(req.competencyTypeIds());
        }
    }

    public void update(StarUpdateReq req) {
        if (req.situation() != null) this.situation = req.situation();
        if (req.task() != null) this.task = req.task();
        if (req.action() != null) this.action = req.action();
        if (req.result() != null) this.result = req.result();
        if (req.startDate() != null) this.startDate = req.startDate();
        if (req.endDate() != null) this.endDate = req.endDate();

        if (req.competencyTypeIds() != null) {
            this.competencyTypeIds.clear();
            this.competencyTypeIds.addAll(req.competencyTypeIds());
        }
    }

    public void clearDates() {
        this.startDate = null;
        this.endDate = null;
    }
}
