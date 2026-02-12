package com.yat2.episode.episode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeUpsertContentReq;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "episodes")
public class Episode {
    @Id
    @Column(name = "node_id", columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "mindmap_id", nullable = false)
    private UUID mindmapId;

    @Column(length = 100)
    private String content;

    public static Episode create(UUID nodeId, UUID mindmapId) {
        Episode episode = new Episode();
        episode.id = nodeId;
        episode.mindmapId = mindmapId;
        return episode;
    }

    public void update(EpisodeUpsertContentReq req) {
        this.content = req.content();
    }
}
