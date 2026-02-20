ALTER TABLE mindmap_participants
    ADD COLUMN last_joined_at DATETIME(6) NULL;

UPDATE mindmap_participants
    SET last_joined_at = updated_at;

ALTER TABLE mindmap_participants
    MODIFY last_joined_at DATETIME(6)
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6);
