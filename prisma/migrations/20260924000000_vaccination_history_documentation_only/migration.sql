-- Vaccination is not an appointment workflow. Preserve existing appointments by
-- reclassifying legacy vaccination appointments as OTHER before narrowing the enum.
UPDATE `Appointment` SET `type` = 'OTHER' WHERE `type` = 'VACCINATION';

ALTER TABLE `Appointment`
  MODIFY `type` ENUM('CONSULTATION', 'FOLLOW_UP', 'SCREENING', 'CLEARANCE', 'OTHER') NOT NULL DEFAULT 'CONSULTATION';
