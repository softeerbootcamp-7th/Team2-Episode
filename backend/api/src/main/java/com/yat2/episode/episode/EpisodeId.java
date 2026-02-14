package com.yat2.episode.episode;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Getter
@EqualsAndHashCode
@AllArgsConstructor
@NoArgsConstructor
@Embeddable
public class EpisodeId implements Serializable {

    @Column(name = "node_id", columnDefinition = "BINARY(16)", nullable = false)
    private UUID nodeId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

}
