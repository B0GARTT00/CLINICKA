import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUDIT_KEY, AUDITED_ENTITIES, AuditMetadata } from '../decorators/audit.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { sanitizeAuditData } from '../utils/sanitize.util';
import { AuditService } from '../audit.service';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: { id?: string; roles?: string[] };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method;
    const entityType = metadata.entityType;

    if (!AUDITED_ENTITIES.has(entityType)) {
      return next.handle();
    }

    const isAuditRoute =
      request.url?.includes('/audit-logs') || request.url?.includes('/audit');
    if (isAuditRoute) {
      return next.handle();
    }

    const actorId = request.user?.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ipAddress = request.ip || (request.connection as any)?.remoteAddress;
    const userAgent = request.get('user-agent');

    let oldValue: unknown = null;
    let action: AuditAction = 'OTHER';

    if (method === 'POST') {
      action = 'CREATE';
    } else if (method === 'GET') {
      action = 'CREATE';
    } else if (method === 'PATCH' || method === 'PUT') {
      action = 'UPDATE';
      const entityId = this.extractEntityId(request, metadata);
      if (entityId) {
        try {
          oldValue = await this.fetchEntity(entityType, entityId);
        } catch {
          oldValue = null;
        }
      }
    } else if (method === 'DELETE') {
      action = 'DELETE';
      const entityId = this.extractEntityId(request, metadata);
      if (entityId) {
        try {
          oldValue = await this.fetchEntity(entityType, entityId);
        } catch {
          oldValue = null;
        }
      }
    }

    try {
      const result = next.handle();

      if (method !== 'DELETE') {
        try {
          const data = await result.toPromise();
          const newValue = sanitizeAuditData(data);
          const entityId = this.extractEntityId(request, metadata);

          if (this.auditService.createAuditLog) {
            await this.auditService.createAuditLog({
              actorId,
              action,
              entity: entityType,
              entityId,
              oldValue: oldValue ? sanitizeAuditData(oldValue) : null,
              newValue,
              ipAddress,
              userAgent,
            });
          }

          return data;
        } catch (error) {
          const entityId = this.extractEntityId(request, metadata);

          if (this.auditService.createAuditLog) {
            try {
              await this.auditService.createAuditLog({
                actorId,
                action,
                entity: entityType,
                entityId,
                oldValue: oldValue ? sanitizeAuditData(oldValue) : null,
                newValue: null,
                ipAddress,
                userAgent,
              });
            } catch {
              // Intentionally swallow audit failures
            }
          }

          throw error;
        }
      }

      const entityId = this.extractEntityId(request, metadata);

      if (this.auditService.createAuditLog) {
        await this.auditService.createAuditLog({
          actorId,
          action,
          entity: entityType,
          entityId,
          oldValue: oldValue ? sanitizeAuditData(oldValue) : null,
          newValue: null,
          ipAddress,
          userAgent,
        });
      }

      return result;
    } catch (error) {
      const entityId = this.extractEntityId(request, metadata);

      if (this.auditService.createAuditLog) {
        try {
          await this.auditService.createAuditLog({
            actorId,
            action,
            entity: entityType,
            entityId,
            oldValue: oldValue ? sanitizeAuditData(oldValue) : null,
            newValue: null,
            ipAddress,
            userAgent,
          });
        } catch {
          // Intentionally swallow audit failures
        }
      }

      throw error;
    }
  }

  private extractEntityId(request: AuthenticatedRequest, metadata: AuditMetadata): string | undefined {
    if (metadata.entityIdParam && request.params && typeof request.params === 'object') {
      const value = request.params[metadata.entityIdParam];
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;
    }
    return undefined;
  }

  private async fetchEntity(entityType: string, entityId: string): Promise<unknown> {
    const modelMap: Record<string, string> = {
      User: 'user',
      Patient: 'patient',
      ClinicVisit: 'clinicVisit',
      Consultation: 'consultation',
      Appointment: 'appointment',
      HealthRequirement: 'healthRequirement',
      Clearance: 'clearance',
      VaccinationRecord: 'vaccinationRecord',
      HealthScreening: 'healthScreening',
      MedicalCertificate: 'medicalCertificate',
      EmergencyCase: 'emergencyCase',
      Role: 'role',
      Permission: 'permission',
    };

    const modelName = modelMap[entityType];
    if (!modelName) return null;

    const prisma = this.prisma as unknown as Record<string, unknown>;
    const model = prisma[modelName];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!model || typeof (model as any).findUnique !== 'function') {
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (model as any).findUnique({ where: { id: entityId } });
    } catch {
      return null;
    }
  }
}
