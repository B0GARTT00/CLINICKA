ALTER TABLE `MedicalCertificate`
  ADD COLUMN `sentAt` DATETIME(3) NULL,
  ADD COLUMN `sentById` VARCHAR(191) NULL;

CREATE INDEX `MedicalCertificate_patientId_sentAt_idx`
  ON `MedicalCertificate`(`patientId`, `sentAt`);
