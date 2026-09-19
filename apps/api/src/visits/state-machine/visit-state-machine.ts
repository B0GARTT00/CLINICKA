import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, PrismaClient, VisitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  canCompleteFrom,
  getPermittedTargets,
  isPermittedTransition,
} from './visit-transitions';
import {
  InvalidVisitTransitionException,
  VisitCannotCompleteFromCurrentStatusException,
  VisitIncompleteForCompletionException,
} from './visit-state-machine.exceptions';

type AuditClient = PrismaClient | Prisma.TransactionClient;

/**
 * Result returned by every state-machine transition.
 */
export interface VisitTransitionResult {
  visit: { id: string; status: VisitStatus };
  previousStatus: VisitStatus;
  nextStatus: VisitStatus;
  timestamp: Date;
}

/**
 * VisitStateMachine
 *
 * Single responsibility: enforce the clinic-visit lifecycle state machine.
 *
 * Every status change must flow through this service. It:
 *   1. Loads the current visit and verifies it exists.
 *   2. Rejects any transition that is not in the canonical transition table.
 *   3. For transitions into COMPLETED, verifies that the longitudinal record
 *      is clinically complete (vital signs documented AND a consultation note
 *      present) and that the visit is in a status that may be completed.
 *   4. Persists the new status.
 *   5. Writes an immutable audit record capturing the actor, source status,
 *      target status and timestamp.
 *
 * The class is deliberately framework-agnostic in its core logic so that the
 * rules can be reused by controllers, other services, and tests.
 */
@Injectable()
export class VisitStateMachine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Transition a visit to `nextStatus`, enforcing the state machine and any
   * completion prerequisites.
   */
  async transition(
    visitId: string,
    nextStatus: VisitStatus,
    actorId: string,
    options: { client?: AuditClient } = {},
  ): Promise<VisitTransitionResult> {
    const visit = await this.loadVisit(visitId, options.client);
    const previousStatus = visit.status;

    if (!isPermittedTransition(previousStatus, nextStatus)) {
      throw new InvalidVisitTransitionException(previousStatus, nextStatus);
    }

    if (nextStatus === VisitStatus.COMPLETED) {
      await this.ensureCompletable(visitId, previousStatus, options.client);
    }

    const updated = await this.updateStatus(visitId, nextStatus, options.client);
    const timestamp = await this.recordTransition(actorId, visitId, previousStatus, nextStatus, options.client);

    return {
      visit: { id: updated.id, status: updated.status },
      previousStatus,
      nextStatus,
      timestamp,
    };
  }

  /**
   * Convenience wrapper that transitions a visit to COMPLETED.
   */
  async complete(visitId: string, actorId: string, options: { client?: AuditClient } = {}) {
    return this.transition(visitId, VisitStatus.COMPLETED, actorId, options);
  }

  /**
   * Convenience wrapper that transitions a visit to CANCELLED.
   */
  async cancel(visitId: string, actorId: string, options: { client?: AuditClient } = {}) {
    return this.transition(visitId, VisitStatus.CANCELLED, actorId, options);
  }

  /**
   * Returns the permitted target statuses for a given state. Useful for UI
   * controls that want to grey-out disallowed actions.
   */
  getPermittedTargets(current: VisitStatus): readonly VisitStatus[] {
    return getPermittedTargets(current);
  }

  // ---- private helpers ---------------------------------------------------

  private async loadVisit(visitId: string, client?: AuditClient) {
    const target = client ?? this.prisma;
    const visit = await target.clinicVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException(`Clinic visit with id '${visitId}' not found.`);
    return visit;
  }

  private async updateStatus(visitId: string, status: VisitStatus, client?: AuditClient) {
    const target = client ?? this.prisma;
    return target.clinicVisit.update({ where: { id: visitId }, data: { status } });
  }

  /**
   * Ensures a visit can be completed: it must be in a completable status and
   * its longitudinal record must contain at least one vital-signs entry and
   * one consultation note.
   */
  private async ensureCompletable(visitId: string, currentStatus: VisitStatus, client?: AuditClient) {
    if (!canCompleteFrom(currentStatus)) {
      throw new VisitCannotCompleteFromCurrentStatusException(currentStatus);
    }

    const target = client ?? this.prisma;
    const [vitalCount, consultationCount] = await Promise.all([
      target.vitalSign.count({ where: { clinicVisitId: visitId } }),
      target.consultation.count({ where: { clinicVisitId: visitId } }),
    ]);

    const missing: string[] = [];
    if (vitalCount === 0) missing.push('vital signs');
    if (consultationCount === 0) missing.push('consultation note');

    if (missing.length > 0) {
      throw new VisitIncompleteForCompletionException(missing);
    }
  }

  private async recordTransition(
    actorId: string,
    visitId: string,
    fromStatus: VisitStatus,
    toStatus: VisitStatus,
    client?: AuditClient,
  ): Promise<Date> {
    const action = this.mapStatusToAuditAction(toStatus);
    await this.audit.recordStatusTransition(actorId, visitId, action, fromStatus, toStatus, client);
    return new Date();
  }

  private mapStatusToAuditAction(status: VisitStatus): AuditAction {
    switch (status) {
      case VisitStatus.OPEN:
        return AuditAction.VISIT_STATUS_OPEN;
      case VisitStatus.IN_CONSULTATION:
        return AuditAction.VISIT_STATUS_IN_CONSULTATION;
      case VisitStatus.COMPLETED:
        return AuditAction.VISIT_STATUS_COMPLETED;
      case VisitStatus.CANCELLED:
        return AuditAction.VISIT_STATUS_CANCELLED;
      default:
        return AuditAction.STATUS_CHANGE;
    }
  }
}