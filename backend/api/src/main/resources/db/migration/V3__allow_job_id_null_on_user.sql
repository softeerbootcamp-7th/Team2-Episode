ALTER TABLE `users`
DROP FOREIGN KEY `user2job`;

ALTER TABLE `users`
    MODIFY COLUMN `job_id` INT NULL;

ALTER TABLE `users`
    ADD CONSTRAINT `user2job`
        FOREIGN KEY (`job_id`)
            REFERENCES `job` (`id`)
            ON DELETE SET NULL
            ON UPDATE CASCADE;