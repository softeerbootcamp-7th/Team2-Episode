ALTER TABLE occupation ALTER COLUMN name VARCHAR(20) NOT NULL;
ALTER TABLE job ALTER COLUMN name VARCHAR(20) NOT NULL;

ALTER TABLE job DROP CONSTRAINT IF EXISTS job_name_unique;

CREATE UNIQUE INDEX uk_job_occupation_name ON job (occupation_id, name);
