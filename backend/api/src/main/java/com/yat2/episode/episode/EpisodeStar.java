package com.yat2.episode.episode;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.yat2.episode.episode.dto.StarUpdateReq;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "episode_stars")
public class EpisodeStar {

    @EmbeddedId
    private EpisodeId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "node_id", referencedColumnName = "node_id", insertable = false, updatable = false
    )
    private Episode episode;

    @ElementCollection
    @CollectionTable(
            name = "episode_star_competency_types",
            joinColumns = { @JoinColumn(name = "node_id", referencedColumnName = "node_id"),
                            @JoinColumn(name = "user_id", referencedColumnName = "user_id") }
    )
    @Column(name = "competency_type_id")
    private Set<Integer> competencyTypeIds = new HashSet<>();

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

    public void clearAll() {
        this.situation = null;
        this.task = null;
        this.action = null;
        this.result = null;
        this.startDate = null;
        this.endDate = null;

        this.competencyTypeIds.clear();
    }
}
