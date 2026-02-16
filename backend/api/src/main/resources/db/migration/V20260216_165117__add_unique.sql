DELETE FROM `diagnosis_weaknesses`;
DELETE FROM `question_job_mappings`;
DELETE FROM `questions`;

ALTER TABLE `question_job_mappings`
ADD UNIQUE INDEX `uq_question_job` (`question_id`, `job_id`);

ALTER TABLE `questions`
ADD UNIQUE INDEX `content_UNIQUE` (`content` ASC) VISIBLE;
