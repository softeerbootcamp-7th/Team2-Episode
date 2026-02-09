CREATE TABLE occupation (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(15) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT occupation_name_unique UNIQUE (name)
);

CREATE TABLE job (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(15) NOT NULL,
    occupation_id INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT job_name_unique UNIQUE (name),
    CONSTRAINT job2occupation FOREIGN KEY (occupation_id) REFERENCES occupation (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE users (
    kakao_id BIGINT NOT NULL,
    job_id INT,
    nickname VARCHAR(45) NOT NULL,
    has_watched_feature_guide BOOLEAN NOT NULL,
    PRIMARY KEY (kakao_id),
    CONSTRAINT user2job FOREIGN KEY (job_id) REFERENCES job (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE competency_type (
    id INT NOT NULL AUTO_INCREMENT,
    type_name VARCHAR(50) NOT NULL,
    category ENUM(
        '협업_커뮤니케이션_역량',
        '문제해결_사고_역량',
        '실행_성장_역량'
    ) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE question (
    id INT NOT NULL AUTO_INCREMENT,
    competency_type_id INT NOT NULL,
    job_id INT NOT NULL,
    content VARCHAR(200) NOT NULL,
    guidance_message VARCHAR(200) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT question2competency_type FOREIGN KEY (competency_type_id) REFERENCES competency_type (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT question2job FOREIGN KEY (job_id) REFERENCES job (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE mindmap (
    id BINARY(16) NOT NULL,
    created_time TIMESTAMP NOT NULL,
    is_shared BOOLEAN NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE episode (
    node_id INT NOT NULL,
    user_id BIGINT NOT NULL,
    mindmap_id BINARY(16) NOT NULL,
    situation VARCHAR(200),
    task VARCHAR(200),
    action VARCHAR(200),
    result VARCHAR(200),
    content VARCHAR(100),
    PRIMARY KEY (node_id, user_id),
    CONSTRAINT experience2user FOREIGN KEY (user_id) REFERENCES users (kakao_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT experience2mindmap FOREIGN KEY (mindmap_id) REFERENCES mindmap (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE user2mindmap (
    id INT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    mindmap_id BINARY(16) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT user2mindmap_map FOREIGN KEY (mindmap_id) REFERENCES mindmap (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT user2mindmap_user FOREIGN KEY (user_id) REFERENCES users (kakao_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE diagnosis_result (
    id INT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    job_id INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT diagnosis_result2job FOREIGN KEY (job_id) REFERENCES job (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT diagnosis_result2user FOREIGN KEY (user_id) REFERENCES users (kakao_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE diagnosis2question (
    id INT NOT NULL AUTO_INCREMENT,
    diagnosis_result_id INT NOT NULL,
    question_id INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT diagnosis2question_q FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT diagnosis2question_res FOREIGN KEY (diagnosis_result_id) REFERENCES diagnosis_result (id) ON DELETE CASCADE ON UPDATE CASCADE
);
