ALTER TABLE `Appointment`
  ADD COLUMN `rescheduledFromId` VARCHAR(191) NULL,
  MODIFY `status` ENUM(
    'PENDING',
    'APPROVED',
    'CONFIRMED',
    'CHECKED_IN',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
    'RESCHEDULED'
  ) NOT NULL DEFAULT 'PENDING';

ALTER TABLE `ClinicVisit`
  ADD COLUMN `appointmentId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Appointment_rescheduledFromId_key`
  ON `Appointment`(`rescheduledFromId`);

CREATE INDEX `Appointment_assignedToId_scheduledAt_idx`
  ON `Appointment`(`assignedToId`, `scheduledAt`);

CREATE UNIQUE INDEX `ClinicVisit_appointmentId_key`
  ON `ClinicVisit`(`appointmentId`);

CREATE INDEX `ClinicVisit_appointmentId_idx`
  ON `ClinicVisit`(`appointmentId`);

ALTER TABLE `ClinicVisit`
  ADD CONSTRAINT `ClinicVisit_appointmentId_fkey`
  FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Appointment`
  ADD CONSTRAINT `Appointment_rescheduledFromId_fkey`
  FOREIGN KEY (`rescheduledFromId`) REFERENCES `Appointment`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
