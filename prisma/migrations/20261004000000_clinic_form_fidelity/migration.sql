ALTER TABLE `Patient` ADD COLUMN `landline` VARCHAR(191) NULL;

ALTER TABLE `PatientHealthRecord`
  ADD COLUMN `doctorContact` VARCHAR(191) NULL,
  ADD COLUMN `hospitalContact` VARCHAR(191) NULL,
  ADD COLUMN `formMetadata` JSON NULL;

ALTER TABLE `MedicalCertificate`
  ADD COLUMN `lateMinutes` INTEGER NULL,
  ADD COLUMN `lateReason` VARCHAR(191) NULL,
  ADD COLUMN `specialCare` TEXT NULL,
  ADD COLUMN `healthCounselling` JSON NULL,
  ADD COLUMN `patientAcknowledgment` JSON NULL,
  ADD COLUMN `physicianSignedAt` DATETIME(3) NULL,
  ADD COLUMN `formMetadata` JSON NULL;
