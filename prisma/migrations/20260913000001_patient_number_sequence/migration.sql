CREATE TABLE `PatientNumberSequence` (
    `year` INTEGER NOT NULL,
    `lastValue` INTEGER NOT NULL,

    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve any already-issued numeric CLN IDs when initializing each year's
-- counter. Older STU/FAC/STF and random-suffix IDs stay unchanged.
INSERT INTO `PatientNumberSequence` (`year`, `lastValue`)
SELECT CAST(SUBSTRING(`patientNumber`, 5, 4) AS UNSIGNED),
       MAX(CAST(SUBSTRING(`patientNumber`, 10) AS UNSIGNED))
FROM `Patient`
WHERE `patientNumber` REGEXP '^CLN-[0-9]{4}-[0-9]{1,5}$'
GROUP BY CAST(SUBSTRING(`patientNumber`, 5, 4) AS UNSIGNED);
