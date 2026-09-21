export class ArchiveEntity {
  id: string;
  recordType: string;
  recordId: string;
  data: unknown;
  archivedBy?: string;
  archivedAt: Date;
  restoredAt?: Date;
  reason?: string;
  createdAt: Date;
}
