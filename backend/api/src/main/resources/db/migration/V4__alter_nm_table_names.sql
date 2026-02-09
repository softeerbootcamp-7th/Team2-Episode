ALTER TABLE user2mindmap DROP CONSTRAINT IF EXISTS user2mindmap_map;
ALTER TABLE user2mindmap DROP CONSTRAINT IF EXISTS user2mindmap_user;

ALTER TABLE user2mindmap RENAME TO mindmap_participant;

DROP INDEX IF EXISTS "2mindmap_idx";
DROP INDEX IF EXISTS "2user_idx";

CREATE INDEX idx_participant_mindmap ON mindmap_participant (mindmap_id);
CREATE INDEX idx_participant_user ON mindmap_participant (user_id);

ALTER TABLE mindmap_participant
    ADD CONSTRAINT fk_participant_mindmap
        FOREIGN KEY (mindmap_id) REFERENCES mindmap (id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;

ALTER TABLE mindmap_participant
    ADD CONSTRAINT fk_participant_user
        FOREIGN KEY (user_id) REFERENCES users (kakao_id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;


ALTER TABLE diagnosis2question DROP CONSTRAINT IF EXISTS diagnosis2question_q;
ALTER TABLE diagnosis2question DROP CONSTRAINT IF EXISTS diagnosis2question_res;

ALTER TABLE diagnosis2question RENAME TO diagnosis_weakness;

DROP INDEX IF EXISTS "2question_idx";
DROP INDEX IF EXISTS "2diagnosis_result_idx";

CREATE INDEX idx_weakness_question ON diagnosis_weakness (question_id);
CREATE INDEX idx_weakness_result ON diagnosis_weakness (diagnosis_result_id);

ALTER TABLE diagnosis_weakness
    ADD CONSTRAINT fk_weakness_question
        FOREIGN KEY (question_id) REFERENCES question (id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;

ALTER TABLE diagnosis_weakness
    ADD CONSTRAINT fk_weakness_result
        FOREIGN KEY (diagnosis_result_id) REFERENCES diagnosis_result (id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
