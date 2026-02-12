ALTER TABLE episodes RENAME TO episode_stars;

ALTER TABLE episode_stars DROP FOREIGN KEY episode2mindmap;
ALTER TABLE episode_stars DROP COLUMN mindmap_id;
ALTER TABLE episode_stars DROP COLUMN content;

CREATE TABLE `episodes` (
    node_id BINARY(16) NOT NULL,
    mindmap_id BINARY(16) NOT NULL,
    content VARCHAR(100) NULL,

    PRIMARY KEY (node_id),

    CONSTRAINT episode2mindmap
        FOREIGN KEY (mindmap_id)
        REFERENCES mindmaps (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

