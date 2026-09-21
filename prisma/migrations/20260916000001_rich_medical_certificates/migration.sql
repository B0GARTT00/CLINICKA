ALTER TABLE `MedicalCertificate`
  ADD COLUMN `findings` TEXT NULL,
  ADD COLUMN `fitnessStatus` VARCHAR(191) NULL,
  ADD COLUMN `recommendations` TEXT NULL,
  ADD COLUMN `followUpAt` DATETIME(3) NULL,
  ADD COLUMN `referredTo` VARCHAR(191) NULL,
  ADD COLUMN `confinementType` VARCHAR(191) NULL,
  ADD COLUMN `confinementFrom` DATETIME(3) NULL,
  ADD COLUMN `confinementUntil` DATETIME(3) NULL,
  ADD COLUMN `physicianName` VARCHAR(191) NULL,
  ADD COLUMN `physicianLicenseNo` VARCHAR(191) NULL,
  ADD COLUMN `physicianPtrNo` VARCHAR(191) NULL,
  ADD COLUMN `physicianContact` VARCHAR(191) NULL,
  ADD COLUMN `requiredImmunizations` JSON NULL;
