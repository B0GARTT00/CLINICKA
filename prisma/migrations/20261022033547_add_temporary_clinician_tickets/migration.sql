-- AlterTable
ALTER TABLE `user` ADD COLUMN `isTemporary` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `temporaryExpiresAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `TemporaryClinicianTicket` (
    `id` VARCHAR(191) NOT NULL,
    `clinicianName` VARCHAR(191) NOT NULL,
    `clinicianEmail` VARCHAR(191) NOT NULL,
    `roleName` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `redeemedAt` DATETIME(3) NULL,
    `userId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TemporaryClinicianTicket_tokenHash_key`(`tokenHash`),
    UNIQUE INDEX `TemporaryClinicianTicket_userId_key`(`userId`),
    INDEX `TemporaryClinicianTicket_clinicianEmail_idx`(`clinicianEmail`),
    INDEX `TemporaryClinicianTicket_expiresAt_redeemedAt_idx`(`expiresAt`, `redeemedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TemporaryClinicianTicket` ADD CONSTRAINT `TemporaryClinicianTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
