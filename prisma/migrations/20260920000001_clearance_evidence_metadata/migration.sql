-- Persist the deterministic eligibility snapshot used during clearance review.
ALTER TABLE `Clearance`
    ADD COLUMN `eligibilityContext` JSON NULL,
    ADD COLUMN `ineligibilityReasons` JSON NULL;

-- Preserve the full evidence lifecycle alongside the current status.
ALTER TABLE `RequirementSubmission`
    ADD COLUMN `statusHistory` JSON NULL;
