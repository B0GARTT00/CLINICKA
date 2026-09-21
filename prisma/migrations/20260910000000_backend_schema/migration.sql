-- DropIndex
DROP INDEX `Notification_userId_isRead_idx` ON `Notification`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE';
UPDATE `User` SET `status` = IF(`isActive`, 'ACTIVE', 'INACTIVE');
ALTER TABLE `User` DROP COLUMN `isActive`;

-- AlterTable
UPDATE `AuditLog` SET `action` = 'OTHER' WHERE `action` = 'EMAIL_VERIFIED';
ALTER TABLE `AuditLog` ADD COLUMN `newValue` JSON NULL,
    ADD COLUMN `oldValue` JSON NULL,
    MODIFY `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'APPROVE', 'REJECT', 'DISPENSE', 'EXPORT', 'ARCHIVE', 'RESTORE', 'LIST_USERS', 'VIEW_USER', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ASSIGN_ROLE', 'ROLE_CHANGE', 'STATUS_CHANGE', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'SIGNUP', 'ACADEMIC_YEAR_CREATED', 'SEMESTER_CREATED', 'APPOINTMENT_CREATED', 'APPOINTMENT_CHECKED_IN', 'APPOINTMENT_STATUS_PENDING', 'APPOINTMENT_STATUS_APPROVED', 'APPOINTMENT_STATUS_CONFIRMED', 'APPOINTMENT_STATUS_COMPLETED', 'APPOINTMENT_STATUS_CANCELLED', 'APPOINTMENT_STATUS_NO_SHOW', 'APPOINTMENT_STATUS_RESCHEDULED', 'CLEARANCE_CREATED', 'CLEARANCE_PENDING', 'CLEARANCE_INCOMPLETE', 'CLEARANCE_FOR_REVIEW', 'CLEARANCE_CLEARED', 'CLEARANCE_REJECTED', 'CLEARANCE_EXPIRED', 'ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT_PUBLISHED', 'MEDICINE_CREATED', 'MEDICINE_STOCKED_IN', 'MEDICINE_DISPENSED', 'EMERGENCY_CASE_CREATED', 'MEDICAL_CERTIFICATE_ISSUED', 'VACCINATION_RECORDED', 'HEALTH_SCREENING_RECORDED', 'VISIT_CREATED', 'VISIT_VITAL_SIGNS_RECORDED', 'VISIT_CONSULTATION_RECORDED', 'VISIT_STATUS_OPEN', 'VISIT_STATUS_IN_CONSULTATION', 'VISIT_STATUS_COMPLETED', 'VISIT_STATUS_CANCELLED', 'PATIENT_ARCHIVED', 'PATIENT_RESTORED', 'PATIENT_EMERGENCY_CONTACT_ADDED', 'PATIENT_HISTORY_ADDED', 'PATIENT_CONDITION_ADDED', 'PATIENT_ALLERGY_ADDED', 'REQUIREMENT_CREATED', 'REQUIREMENT_SUBMITTED', 'REQUIREMENT_NOT_SUBMITTED', 'REQUIREMENT_UNDER_REVIEW', 'REQUIREMENT_VERIFIED', 'REQUIREMENT_REJECTED', 'REQUIREMENT_EXPIRED', 'OTHER') NOT NULL;

-- AlterTable
UPDATE `Patient` SET `sex` = CASE UPPER(`sex`)
  WHEN 'MALE' THEN 'MALE'
  WHEN 'FEMALE' THEN 'FEMALE'
  WHEN 'OTHER' THEN 'OTHER'
  ELSE 'PREFER_NOT_TO_SAY'
END WHERE `sex` IS NOT NULL;
ALTER TABLE `Patient` MODIFY `sex` ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY') NULL;

-- AlterTable
ALTER TABLE `ClinicVisit` ADD COLUMN `clinicianId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Appointment` ADD COLUMN `cancellationReason` VARCHAR(191) NULL,
    ADD COLUMN `priority` ENUM('ROUTINE', 'URGENT', 'EMERGENCY') NOT NULL DEFAULT 'ROUTINE',
    ADD COLUMN `type` ENUM('CONSULTATION', 'FOLLOW_UP', 'VACCINATION', 'SCREENING', 'CLEARANCE', 'OTHER') NOT NULL DEFAULT 'CONSULTATION',
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `RequirementSubmission` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NULL;
UPDATE `RequirementSubmission` SET `updatedAt` = `createdAt` WHERE `updatedAt` IS NULL;
ALTER TABLE `RequirementSubmission` MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `VaccinationRecord` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NULL;
UPDATE `VaccinationRecord` SET `updatedAt` = `createdAt` WHERE `updatedAt` IS NULL;
ALTER TABLE `VaccinationRecord` MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `HealthScreening` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NULL;
UPDATE `HealthScreening` SET `updatedAt` = `createdAt` WHERE `updatedAt` IS NULL;
ALTER TABLE `HealthScreening` MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `InventoryTransaction` MODIFY `type` ENUM('STOCK_IN', 'ADJUSTMENT', 'DISPENSE', 'RETURNED', 'EXPIRED', 'DAMAGED', 'LOST') NOT NULL;

-- AlterTable
UPDATE `EmergencyCase` SET `emergencyType` = 'OTHER' WHERE `emergencyType` = '';
UPDATE `EmergencyCase` SET `disposition` = NULL WHERE `disposition` = '';
ALTER TABLE `EmergencyCase` ADD COLUMN `updatedAt` DATETIME(3) NULL,
    MODIFY `emergencyType` ENUM('ILLNESS', 'INJURY', 'ALLERGIC_REACTION', 'ASTHMA', 'DIABETIC_EMERGENCY', 'OTHER') NOT NULL,
    MODIFY `disposition` ENUM('DISCHARGED', 'ADMITTED', 'REFERRED', 'TRANSFERRED', 'OBSERVATION') NULL;
UPDATE `EmergencyCase` SET `updatedAt` = `createdAt` WHERE `updatedAt` IS NULL;
ALTER TABLE `EmergencyCase` MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
UPDATE `MedicalCertificate` SET `type` = CASE
  WHEN `type` IN ('Medical Certificate', 'MEDICAL_CLEARANCE') THEN 'MEDICAL_CLEARANCE'
  WHEN `type` = 'Fitness for School' THEN 'FITNESS_FOR_SCHOOL'
  WHEN `type` = 'Fitness for Work' THEN 'FITNESS_FOR_WORK'
  WHEN `type` = 'Vaccination Certificate' THEN 'VACCINATION_CERTIFICATE'
  WHEN `type` = 'Medical Exemption' THEN 'MEDICAL_EXEMPTION'
  ELSE 'OTHER'
END;
ALTER TABLE `MedicalCertificate` ADD COLUMN `updatedAt` DATETIME(3) NULL,
    MODIFY `type` ENUM('MEDICAL_CLEARANCE', 'FITNESS_FOR_SCHOOL', 'FITNESS_FOR_WORK', 'VACCINATION_CERTIFICATE', 'MEDICAL_EXEMPTION', 'OTHER') NOT NULL;
UPDATE `MedicalCertificate` SET `updatedAt` = `createdAt` WHERE `updatedAt` IS NULL;
ALTER TABLE `MedicalCertificate` MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
UPDATE `Notification` SET `type` = 'SYSTEM' WHERE `type` = '';
ALTER TABLE `Notification` ADD COLUMN `status` ENUM('UNREAD', 'READ') NOT NULL DEFAULT 'UNREAD',
    MODIFY `type` ENUM('SYSTEM', 'APPOINTMENT', 'REQUIREMENT', 'CLEARANCE', 'ANNOUNCEMENT', 'OTHER') NOT NULL;
UPDATE `Notification` SET `status` = IF(`isRead`, 'READ', 'UNREAD');
ALTER TABLE `Notification` DROP COLUMN `isRead`;

-- AlterTable
ALTER TABLE `Announcement` ADD COLUMN `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `Archive` (
    `id` VARCHAR(191) NOT NULL,
    `recordType` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `archivedBy` VARCHAR(191) NULL,
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `restoredAt` DATETIME(3) NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Archive_recordType_recordId_idx`(`recordType`, `recordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SystemSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `User_status_idx` ON `User`(`status`);

-- CreateIndex
CREATE INDEX `User_deletedAt_idx` ON `User`(`deletedAt`);

-- CreateIndex
CREATE INDEX `AuditLog_action_createdAt_idx` ON `AuditLog`(`action`, `createdAt`);

-- CreateIndex
CREATE INDEX `AuditLog_entity_entityId_createdAt_idx` ON `AuditLog`(`entity`, `entityId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Notification_userId_status_idx` ON `Notification`(`userId`, `status`);

-- AddForeignKey
ALTER TABLE `ClinicVisit` ADD CONSTRAINT `ClinicVisit_clinicianId_fkey` FOREIGN KEY (`clinicianId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VitalSign` ADD CONSTRAINT `VitalSign_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Consultation` ADD CONSTRAINT `Consultation_clinicianId_fkey` FOREIGN KEY (`clinicianId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequirementSubmission` ADD CONSTRAINT `RequirementSubmission_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Clearance` ADD CONSTRAINT `Clearance_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VaccinationRecord` ADD CONSTRAINT `VaccinationRecord_administeredById_fkey` FOREIGN KEY (`administeredById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthScreening` ADD CONSTRAINT `HealthScreening_screenedById_fkey` FOREIGN KEY (`screenedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryTransaction` ADD CONSTRAINT `InventoryTransaction_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicineDispensation` ADD CONSTRAINT `MedicineDispensation_clinicVisitId_fkey` FOREIGN KEY (`clinicVisitId`) REFERENCES `ClinicVisit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicineDispensation` ADD CONSTRAINT `MedicineDispensation_dispensedById_fkey` FOREIGN KEY (`dispensedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyCase` ADD CONSTRAINT `EmergencyCase_attendedById_fkey` FOREIGN KEY (`attendedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalCertificate` ADD CONSTRAINT `MedicalCertificate_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Archive` ADD CONSTRAINT `Archive_archivedBy_fkey` FOREIGN KEY (`archivedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
