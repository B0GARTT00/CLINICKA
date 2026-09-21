import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma, type PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditClient = PrismaClient | Prisma.TransactionClient;

/**
 * AuditService is the single entry point for writing audit logs.
 *
 * It is intentionally thin: it knows how to persist an AuditLog row and how
 * to query them. Business modules (visits, appointments, ...) should never
 * call `prisma.auditLog.create` directly; they call methods on this service
 * so that every audit record is shaped consistently.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a generic audit entry.
   *
   * `metadata` is merged into the AuditLog.metadata JSON column and can hold
   * arbitrary context (e.g. source/target status for a state transition).
   */
  record(
    actorId: string | undefined,
    action: AuditAction,
    entity: string,
    entityId: string,
    options: { oldValue?: Prisma.InputJsonValue; newValue?: Prisma.InputJsonValue; metadata?: Prisma.InputJsonValue } = {},
    client?: AuditClient,
  ) {
    const target = client ?? this.prisma;
    const data: Prisma.AuditLogUncheckedCreateInput = { actorId, action, entity, entityId };
    if (options.oldValue !== undefined) data.oldValue = options.oldValue;
    if (options.newValue !== undefined) data.newValue = options.newValue;
    if (options.metadata !== undefined) data.metadata = options.metadata;
    return target.auditLog.create({ data });
  }

  /**
   * Records a visit status transition.
   *
   * The previous and new status are captured in both the structured
   * `metadata` field (for easy querying) and the `oldValue`/`newValue` JSON
   * columns (for a full before/after snapshot). The `createdAt` timestamp is
   * set by the database default, which satisfies the requirement that every
   * transition capture the time of the change.
   */
  recordStatusTransition(
    actorId: string | undefined,
    visitId: string,
    action: AuditAction,
    fromStatus: string,
    toStatus: string,
    client?: AuditClient,
  ) {
    return this.recordEntityStatusTransition(
      actorId,
      'ClinicVisit',
      visitId,
      action,
      fromStatus,
      toStatus,
      client,
    );
  }

  recordEntityStatusTransition(
    actorId: string | undefined,
    entity: string,
    entityId: string,
    action: AuditAction,
    fromStatus: string,
    toStatus: string,
    client?: AuditClient,
  ) {
    return this.record(
      actorId,
      action,
      entity,
      entityId,
      {
        oldValue: { status: fromStatus },
        newValue: { status: toStatus },
        metadata: {
          fromStatus,
          toStatus,
          transition: `${fromStatus} -> ${toStatus}`,
        },
      },
      client,
    );
  }

  list(action?: string, entity?: string) {
    return this.prisma.auditLog.findMany({
      where: {
        action: action ? (action as AuditAction) : undefined,
        entity: entity ? { equals: entity } : undefined,
      },
      include: { actor: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
