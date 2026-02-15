ALTER TABLE episodes RENAME TO episode_stars;

ALTER TABLE episode_stars DROP FOREIGN KEY episode2mindmap;

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

INSERT INTO episodes (node_id, mindmap_id, content)
SELECT node_id, mindmap_id, content
FROM episode_stars;

ALTER TABLE episode_stars DROP COLUMN mindmap_id;
ALTER TABLE episode_stars DROP COLUMN content;

ALTER TABLE `episode_stars`
ADD CONSTRAINT `fk_star2episode`
FOREIGN KEY (`node_id`) REFERENCES `episodes` (`node_id`)
ON UPDATE CASCADE ON DELETE CASCADE;
