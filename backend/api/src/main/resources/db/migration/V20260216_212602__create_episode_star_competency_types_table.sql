CREATE TABLE episode_star_competency_types (
  node_id BINARY(16) NOT NULL,
  user_id BIGINT NOT NULL,
  competency_type_id INT NOT NULL,
  PRIMARY KEY (node_id, user_id, competency_type_id),
  CONSTRAINT fk_esct_star
    FOREIGN KEY (node_id, user_id)
    REFERENCES episode_stars (node_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_esct_competency
    FOREIGN KEY (competency_type_id)
    REFERENCES competency_types (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE episode_stars DROP COLUMN competency_type_ids;
