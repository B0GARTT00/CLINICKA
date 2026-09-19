import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EvidenceStatus } from './evidence-transitions';
import { InvalidEvidenceTransitionException } from './evidence-state-machine.exceptions';

type AuditClient = PrismaClient | Prisma.TransactionClient;

export interface StatusHistoryEntry {
  from: string;
  to: string;
  actorId: string;
  timestamp: string;
  notes?: string;
}

/**
 * EvidenceSubmissionStateMachine
 *
 * Enforces the evidence submission lifecycle:
 *   SUBMITTED → VERIFIED (terminal) or REJECTED
 *   REJECTED → SUBMITTED (resubmit)
 *
 * Records every transition in the status history array and audit log.
 */
@Injectable()
export class EvidenceSubmissionStateMachine {
  private readonly logger = new Logger(EvidenceSubmissionStateMachine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Transition a submission to `nextStatus`, enforcing the state machine.
   */
  async transition(
    submissionId: string,
    nextStatus: EvidenceStatus,
    actorId: string,
    options: { client?: AuditClient; notes?: string } = {},
  ) {
    const client = options.client ?? this.prisma;
    const submission = await this.loadSubmission(submissionId, client);
    const previousStatus = submission.status as EvidenceStatus;

    if (!this.isPermittedTransition(previousStatus, nextStatus)) {
      throw new InvalidEvidenceTransitionException(previousStatus, nextStatus);
    }

    const historyEntry: StatusHistoryEntry = {
      from: previousStatus,
      to: nextStatus,
      actorId,
      timestamp: new Date().toISOString(),
      notes: options.notes,
    };

    // Append to status history (stored as a single JSON array)
    const existingHistory = (submission.statusHistory as unknown as StatusHistoryEntry[]) ?? [];
    const updatedHistory = [...existingHistory, historyEntry];

    const updated = await client.requirementSubmission.update({
      where: { id: submissionId },
      data: {
        status: nextStatus,
        statusHistory: updatedHistory as Prisma.JsonValue,
      },
    });

    const action = this.mapStatusToAuditAction(nextStatus);
    await this.audit.record(actorId, action, 'RequirementSubmission', submissionId, {
      metadata: {
        fromStatus: previousStatus,
        toStatus: nextStatus,
        transition: `${previousStatus} -> ${nextStatus}`,
      },
    }, client);

    return {
      submission: { id: updated.id, status: updated.status as EvidenceStatus },
      previousStatus,
      nextStatus,
      timestamp: new Date(),
    };
  }

  /**
   * Returns true when a transition from `current` to `next` is permitted.
   */
  isPermittedTransition(current: EvidenceStatus, next: EvidenceStatus): boolean {
    if (current === next) return true;
    const targets = this.getPermittedTargets(current);
    return targets.includes(next);
  }

  /**
   * Returns the permitted target statuses for a given state.
   */
  getPermittedTargets(current: EvidenceStatus): EvidenceStatus[] {
    switch (current) {
      case EvidenceStatus.SUBMITTED:
        return [EvidenceStatus.VERIFIED, EvidenceStatus.REJECTED];
      case EvidenceStatus.VERIFIED:
        return [];
      case EvidenceStatus.REJECTED:
        return [EvidenceStatus.SUBMITTED];
      default:
        return [];
    }
  }

  /**
   * Returns true when a submission is in a terminal state.
   */
  isTerminalStatus(status: EvidenceStatus): boolean {
    return this.getPermittedTargets(status).length === 0;
  }

  /**
   * Returns the status history for a submission.
   */
  async getStatusHistory(submissionId: string): Promise<StatusHistoryEntry[]> {
    const submission = await this.loadSubmission(submissionId);
    return (submission.statusHistory as unknown as StatusHistoryEntry[]) ?? [];
  }

  private async loadSubmission(submissionId: string, client?: AuditClient) {
    const target = client ?? this.prisma;
    const submission = await target.requirementSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException(`Requirement submission with id '${submissionId}' not found.`);
    return submission;
  }

  private mapStatusToAuditAction(status: EvidenceStatus): AuditAction {
    switch (status) {
      case EvidenceStatus.SUBMITTED:
        return AuditAction.REQUIREMENT_SUBMITTED;
      case EvidenceStatus.VERIFIED:
        return AuditAction.REQUIREMENT_VERIFIED;
      case EvidenceStatus.REJECTED:
        return AuditAction.REQUIREMENT_REJECTED;
      default:
        return AuditAction.OTHER;
    }
  }
}