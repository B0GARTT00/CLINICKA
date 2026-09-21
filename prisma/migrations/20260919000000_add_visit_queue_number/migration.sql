ALTER TABLE `ClinicVisit` ADD COLUMN `queueNumber` INTEGER NULL;

CREATE INDEX `ClinicVisit_queueNumber_idx` ON `ClinicVisit`(`queueNumber`);
