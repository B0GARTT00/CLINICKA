CREATE TABLE `Department` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Department_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Program` (
  `id` VARCHAR(191) NOT NULL,
  `departmentId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Program_departmentId_idx`(`departmentId`),
  UNIQUE INDEX `Program_departmentId_name_key`(`departmentId`, `name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StudentProfile`
  ADD COLUMN `departmentId` VARCHAR(191) NULL,
  ADD COLUMN `programId` VARCHAR(191) NULL,
  ADD INDEX `StudentProfile_departmentId_idx`(`departmentId`),
  ADD INDEX `StudentProfile_programId_idx`(`programId`);

ALTER TABLE `EmployeeProfile`
  ADD COLUMN `departmentId` VARCHAR(191) NULL,
  ADD INDEX `EmployeeProfile_departmentId_idx`(`departmentId`);

ALTER TABLE `HealthRequirement`
  ADD COLUMN `departmentIds` JSON NULL,
  ADD COLUMN `programIds` JSON NULL,
  ADD COLUMN `yearLevels` JSON NULL;

ALTER TABLE `Program` ADD CONSTRAINT `Program_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `StudentProfile` ADD CONSTRAINT `StudentProfile_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `StudentProfile` ADD CONSTRAINT `StudentProfile_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EmployeeProfile` ADD CONSTRAINT `EmployeeProfile_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
