package com.yat2.episode.mindmap;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

import com.yat2.episode.user.User;

@Entity
@Getter
@Table(
        name = "mindmap_participants", uniqueConstraints = @UniqueConstraint(
        name = "uk_mindmap_participant_user_mindmap", columnNames = { "user_id", "mindmap_id" }
)
)
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MindmapParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mindmap_id", nullable = false)
    private Mindmap mindmap;

    @Column(name = "is_favorite", insertable = false)
    private boolean isFavorite;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "last_joined_at", nullable = false, insertable = false)
    private LocalDateTime lastJoinedAt;

    public MindmapParticipant(User user, Mindmap mindmap) {
        this.user = user;
        this.mindmap = mindmap;
    }

    public void updateLastJoinedAt() {
        this.lastJoinedAt = LocalDateTime.now();
    }

    public void updateFavorite(boolean status) {
        this.isFavorite = status;
    }
}
