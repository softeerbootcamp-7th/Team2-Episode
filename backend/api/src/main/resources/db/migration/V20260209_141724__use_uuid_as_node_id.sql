DROP TABLE episodes;

CREATE TABLE episodes (
    node_id BINARY(16) NOT NULL,
    user_id BIGINT NOT NULL,

    mindmap_id BINARY(16) NOT NULL,

    situation VARCHAR(200) NULL,
    task VARCHAR(200) NULL,
    action VARCHAR(200) NULL,
    result VARCHAR(200) NULL,
    content VARCHAR(100) NULL,

    competency_type_id INT NULL,

    created_at DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (node_id, user_id),

    CONSTRAINT episode2competency_type
        FOREIGN KEY (competency_type_id)
        REFERENCES competency_types (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT episode2mindmap
        FOREIGN KEY (mindmap_id)
        REFERENCES mindmaps (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT episode2user
        FOREIGN KEY (user_id)
        REFERENCES users (kakao_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
