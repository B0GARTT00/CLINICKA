/*
  Warnings:

  - You are about to drop the column `emailVerificationExpiresAt` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerificationTokenHash` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `User_emailVerificationTokenHash_key` ON `user`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `emailVerificationExpiresAt`,
    DROP COLUMN `emailVerificationTokenHash`;

-- CreateTable
CREATE TABLE `UnverifiedUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `registrationProfile` JSON NULL,
    `verificationTokenHash` VARCHAR(191) NOT NULL,
    `verificationExpiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UnverifiedUser_email_key`(`email`),
    UNIQUE INDEX `UnverifiedUser_verificationTokenHash_key`(`verificationTokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
