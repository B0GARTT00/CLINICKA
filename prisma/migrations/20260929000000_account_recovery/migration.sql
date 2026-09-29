-- Account recovery tokens are random, stored only as hashes, expire, and are
-- cleared atomically when consumed.
ALTER TABLE `User`
  ADD COLUMN `passwordResetTokenHash` VARCHAR(191) NULL,
  ADD COLUMN `passwordResetExpiresAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `User_passwordResetTokenHash_key`
  ON `User`(`passwordResetTokenHash`);
