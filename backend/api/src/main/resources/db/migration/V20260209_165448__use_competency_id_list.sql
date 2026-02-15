ALTER TABLE episodes DROP FOREIGN KEY episode2competency_type;

ALTER TABLE episodes ADD competency_type_ids JSON
    NOT NULL DEFAULT (JSON_ARRAY());

ALTER TABLE episodes DROP COLUMN competency_type_id;
