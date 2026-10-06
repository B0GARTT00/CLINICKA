CREATE TABLE `DentalRecord` (
  `id` VARCHAR(191) NOT NULL,
  `patientId` VARCHAR(191) NOT NULL,
  `examinedAt` DATETIME(3) NOT NULL,
  `courseYearSection` VARCHAR(191) NULL,
  `toothChart` JSON NULL,
  `plaqueLevel` VARCHAR(191) NULL,
  `hasGingivitis` BOOLEAN NOT NULL DEFAULT false,
  `hasPeriodontitis` BOOLEAN NOT NULL DEFAULT false,
  `retainerUpper` BOOLEAN NOT NULL DEFAULT false,
  `retainerLower` BOOLEAN NOT NULL DEFAULT false,
  `bracesUpper` BOOLEAN NOT NULL DEFAULT false,
  `bracesLower` BOOLEAN NOT NULL DEFAULT false,
  `oralCondition` VARCHAR(191) NULL,
  `fillingCount` INTEGER NULL,
  `extractionCount` INTEGER NULL,
  `needsOralProphylaxis` BOOLEAN NOT NULL DEFAULT false,
  `recommendation` VARCHAR(191) NULL,
  `remarks` TEXT NULL,
  `dentistName` VARCHAR(191) NULL,
  `waiverDueAt` DATETIME(3) NULL,
  `waiverSignedAt` DATETIME(3) NULL,
  `waiverSignedBy` VARCHAR(191) NULL,
  `formMetadata` JSON NULL,
  `recordedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `DentalRecord_patientId_examinedAt_idx`(`patientId`, `examinedAt`),
  INDEX `DentalRecord_examinedAt_idx`(`examinedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DentalRecord`
  ADD CONSTRAINT `DentalRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `DentalRecord_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
