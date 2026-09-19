CREATE TABLE `PatientHealthRecord` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `guardianName` VARCHAR(191) NULL,
    `spouseName` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `doctorOfChoice` VARCHAR(191) NULL,
    `hospitalOfChoice` VARCHAR(191) NULL,
    `presentHistory` TEXT NULL,
    `reviewOfSystems` TEXT NULL,
    `pastMedicalHistory` JSON NULL,
    `obGyneHistory` JSON NULL,
    `familyHistory` JSON NULL,
    `psychosocialHistory` JSON NULL,
    `physicalExamination` JSON NULL,
    `laboratoryExaminations` JSON NULL,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PatientHealthRecord_patientId_key`(`patientId`),
    INDEX `PatientHealthRecord_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PatientHealthRecord` ADD CONSTRAINT `PatientHealthRecord_patientId_fkey`
  FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
