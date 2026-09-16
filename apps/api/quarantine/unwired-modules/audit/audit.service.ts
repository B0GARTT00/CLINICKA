import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

type AuditLogFilters = {
  page?: number;
  limit?: number;
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
};

type PaginatedAuditLogs = {
  data: unknown[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: AuditLogFilters = {}): Promise<PaginatedAuditLogs> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.userId) {
      where.actorId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entity = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, unknown>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, unknown>).lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.toResponse(log)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  }

  async createAuditLog(data: {
    actorId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: data.actorId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oldValue: data.oldValue as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newValue: data.newValue as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: data.metadata as any,
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  }

  private toResponse(log: {
    id: string;
    actorId: string | null;
    actor: { id: string; email: string; displayName: string } | null;
    action: AuditAction;
    entity: string;
    entityId: string | null;
    oldValue: unknown;
    newValue: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: unknown;
    createdAt: Date;
  }) {
    return {
      id: log.id,
      actorId: log.actorId,
      actor: log.actor,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
    };
  }
}
