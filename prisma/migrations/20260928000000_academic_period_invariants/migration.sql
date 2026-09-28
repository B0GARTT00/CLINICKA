-- Academic periods use closed ranges: startsAt must precede endsAt, and two
-- periods overlap when they share any instant. Historical requirement and
-- clearance references are restrictive so their original context cannot be
-- erased by deleting a semester or academic year.

-- Normalize legacy active flags before adding singleton keys. The latest
-- starting active period wins deterministically if older data contains more
-- than one.
UPDATE `AcademicYear`
SET `isActive` = false
WHERE `isActive` = true
  AND `id` <> COALESCE((
    SELECT `selected`.`id`
    FROM (
      SELECT `id` FROM `AcademicYear`
      WHERE `isActive` = true
      ORDER BY `startsAt` DESC, `id` ASC
      LIMIT 1
    ) AS `selected`
  ), '');

UPDATE `Semester`
SET `isActive` = false
WHERE `isActive` = true
  AND `id` <> COALESCE((
    SELECT `selected`.`id`
    FROM (
      SELECT `s`.`id`
      FROM `Semester` AS `s`
      INNER JOIN `AcademicYear` AS `ay` ON `ay`.`id` = `s`.`academicYearId`
      WHERE `s`.`isActive` = true AND `ay`.`isActive` = true
      ORDER BY `s`.`startsAt` DESC, `s`.`id` ASC
      LIMIT 1
    ) AS `selected`
  ), '');

UPDATE `Semester` AS `s`
LEFT JOIN `AcademicYear` AS `ay` ON `ay`.`id` = `s`.`academicYearId`
SET `s`.`isActive` = false
WHERE `s`.`isActive` = true AND (`ay`.`id` IS NULL OR `ay`.`isActive` = false);

ALTER TABLE `AcademicYear`
  ADD COLUMN `activeKey` INTEGER NULL,
  ADD CONSTRAINT `AcademicYear_valid_date_range` CHECK (`startsAt` < `endsAt`);

ALTER TABLE `Semester`
  ADD COLUMN `activeKey` INTEGER NULL,
  ADD CONSTRAINT `Semester_valid_date_range` CHECK (`startsAt` < `endsAt`);

UPDATE `AcademicYear` SET `activeKey` = IF(`isActive`, 1, NULL);
UPDATE `Semester` SET `activeKey` = IF(`isActive`, 1, NULL);

CREATE UNIQUE INDEX `AcademicYear_activeKey_key` ON `AcademicYear`(`activeKey`);
CREATE UNIQUE INDEX `Semester_activeKey_key` ON `Semester`(`activeKey`);

ALTER TABLE `Semester` DROP FOREIGN KEY `Semester_academicYearId_fkey`;
ALTER TABLE `Semester`
  ADD CONSTRAINT `Semester_academicYearId_fkey`
  FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `HealthRequirement` DROP FOREIGN KEY `HealthRequirement_semesterId_fkey`;
ALTER TABLE `HealthRequirement`
  ADD CONSTRAINT `HealthRequirement_semesterId_fkey`
  FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Clearance` DROP FOREIGN KEY `Clearance_semesterId_fkey`;
ALTER TABLE `Clearance`
  ADD CONSTRAINT `Clearance_semesterId_fkey`
  FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
