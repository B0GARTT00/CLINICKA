-- Composite indexes justified by the API's high-use operational query shapes.
-- No data is removed or rewritten by this migration.

CREATE INDEX `Patient_archiveStatus_deletedAt_lastName_firstName_idx`
  ON `Patient`(`archiveStatus`, `deletedAt`, `lastName`, `firstName`);

CREATE INDEX `ClinicVisit_status_visitDate_queueNumber_idx`
  ON `ClinicVisit`(`status`, `visitDate`, `queueNumber`);

CREATE INDEX `VitalSign_clinicVisitId_recordedAt_idx`
  ON `VitalSign`(`clinicVisitId`, `recordedAt`);

CREATE INDEX `Appointment_status_scheduledAt_idx`
  ON `Appointment`(`status`, `scheduledAt`);

CREATE INDEX `Clearance_status_updatedAt_idx`
  ON `Clearance`(`status`, `updatedAt`);

CREATE INDEX `Medicine_deletedAt_name_idx`
  ON `Medicine`(`deletedAt`, `name`);

CREATE INDEX `MedicineBatch_medicineId_expiresAt_idx`
  ON `MedicineBatch`(`medicineId`, `expiresAt`);

CREATE INDEX `InventoryTransaction_createdAt_idx`
  ON `InventoryTransaction`(`createdAt`);

CREATE INDEX `Notification_userId_createdAt_idx`
  ON `Notification`(`userId`, `createdAt`);

CREATE INDEX `Announcement_createdAt_idx`
  ON `Announcement`(`createdAt`);
