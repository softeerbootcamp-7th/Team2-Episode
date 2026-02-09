ALTER TABLE episode ADD COLUMN competency_type_id INT;
ALTER TABLE episode
    ADD CONSTRAINT episode2competency_type
    FOREIGN KEY (competency_type_id)
    REFERENCES competency_type (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
