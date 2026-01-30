package com.yat2.episode.mindmap;

import com.yat2.episode.users.Users;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(
        name = "mindmap_participant",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_mindmap_participant_user_mindmap",
                columnNames = {"user_id", "mindmap_id"}
        )
)
public class MindmapParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mindmap_id", nullable = false)
    private Mindmap mindmap;

}
