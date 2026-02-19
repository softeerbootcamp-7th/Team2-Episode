CREATE INDEX idx_refresh_token_user_id ON refresh_token(user_id);

ALTER TABLE refresh_token DROP INDEX uk_refresh_token_user_id;
