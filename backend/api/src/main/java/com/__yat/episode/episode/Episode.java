package com.__yat.episode.episode;

import jakarta.persistence.*;

import com.__yat.episode.users.Users;
import com.__yat.episode.mindmap.Mindmap;
import lombok.Getter;
import lombok.Setter;


@Getter
@Setter
@Entity
@Table(name = "episode")
public class Episode {

    @EmbeddedId
    private EpisodeId id;

    @MapsId("userId")
    @ManyToOne
    @JoinColumn(name = "user_id")
    private Users user;

    @MapsId("nodeId")
    @Column(name = "node_id")
    private Integer nodeId;

    @ManyToOne
    @JoinColumn(name = "mindmap_id")
    private Mindmap mindmap;

    private String situation;
    private String task;
    private String action;
    private String result;
    private String content;
}