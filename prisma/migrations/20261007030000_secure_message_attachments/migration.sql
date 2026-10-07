CREATE TABLE `ClinicMessageAttachment` (
  `id` VARCHAR(191) NOT NULL,
  `messageId` VARCHAR(191) NOT NULL,
  `documentId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ClinicMessageAttachment_documentId_key`(`documentId`),
  INDEX `ClinicMessageAttachment_messageId_idx`(`messageId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClinicMessageAttachment`
  ADD CONSTRAINT `ClinicMessageAttachment_messageId_fkey`
  FOREIGN KEY (`messageId`) REFERENCES `ClinicMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ClinicMessageAttachment`
  ADD CONSTRAINT `ClinicMessageAttachment_documentId_fkey`
  FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
