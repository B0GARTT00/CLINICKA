export class AuditLogEntity {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
