import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EvidenceSubmissionStateMachine, EvidenceStatus } from './state-machine/evidence-state-machine';
import { EvidenceAlreadySubmittedException } from './state-machine/evidence-state-machine.exceptions';

/**
 * EvidenceService
 *
 * Manages patient evidence submission, authorized clinic review, status
 * history tracking, and document linkage.
 *
 * Core responsibilities:
 *   1. Submission: Patients submit evidence for their own requirements only.
 *   2. Review: Authorized clinicians review and approve/reject submissions.
 *   3. History: Every status change is recorded in the statusHistory array.
 *   4. Linkage: Submissions link to Document records for traceability.
 */
@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stateMachine: EvidenceSubmissionStateMachine,
  ) {}

  /**
   * Submit evidence for a health requirement.
   *
   * Rules:
   *   - Patient can only submit for their own requirements.
   *   - Duplicate submissions are prevented (one per requirement per patient).
   *   - A document must be linked to the submission.
   */
  async submit(
    requirementId: string,
    documentId: string,
    patientId: string,
    actorId: string,
    options: { expiresAt?: Date } = {},
  ) {
    // Verify the patient owns this requirement
    const [requirement, patient] = await Promise.all([
      this.prisma.healthRequirement.findUnique({ where: { id: requirementId } }),
      this.prisma.patient.findFirst({
        where: { id: patientId, deletedAt: null },
      }),
    ]);

    if (!requirement) throw new NotFoundException('Health requirement not found.');
    if (!patient) throw new NotFoundException('Patient not found.');
    if (patient.id !== patientId) {
      throw new ForbiddenException('Patients can only submit evidence for their own requirements.');
    }

    // Verify the document exists and belongs to the patient
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found.');
    if (document.patientId && document.patientId !== patientId) {
      throw new ForbiddenException('Document does not belong to this patient.');
    }

    // Check for duplicate submission
    const existing = await this.prisma.requirementSubmission.findFirst({
      where: { requirementId, patientId },
    });
    if (existing) {
      throw new EvidenceAlreadySubmittedException(requirementId, patientId);
    }

    // Create submission with initial status history
    const submission = await this.prisma.requirementSubmission.create({
      data: {
        requirementId,
        patientId,
        documentId,
        status: 'SUBMITTED',
        expiresAt: options.expiresAt,
        statusHistory: [
          {
            from: null,
            to: 'SUBMITTED',
            actorId,
            timestamp: new Date().toISOString(),
            notes: 'Evidence submitted by patient',
          },
        ],
      },
      include: { requirement: true, patient: true, document: true },
    });

    await this.audit.record(actorId, AuditAction.REQUIREMENT_SUBMITTED, 'RequirementSubmission', submission.id);
    return submission;
  }

  /**
   * Review a submission, transitioning its status.
   *
   * Rules:
   *   - Only authorized clinicians (CLINIC_NURSE, DOCTOR, ADMINISTRATOR) can review.
   *   - Status transitions are enforced by the state machine.
   *   - Clinical notes must be recorded.
   */
  async review(
    submissionId: string,
    status: EvidenceStatus,
    reviewerId: string,
    notes?: string,
  ) {
    // Verify the reviewer is authorized
    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewerId } });
    if (!reviewer) throw new NotFoundException('Reviewer not found.');

    const authorizedRoles = ['ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR'];
    if (!authorizedRoles.includes(reviewer.role)) {
      throw new ForbiddenException('You are not authorized to review evidence submissions.');
    }

    return this.stateMachine.transition(submissionId, status, reviewerId, { notes });
  }

  /**
   * List submissions with optional status filter and authorization check.
   *
   * Patients see only their own submissions.
   * Clinicians see all submissions.
   */
  async listSubmissions(
    requesterId: string,
    options: { status?: EvidenceStatus; patientId?: string } = {},
  ) {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) throw new NotFoundException('User not found.');

    const isPatient = requester.role === 'PATIENT';
    const where: Prisma.RequirementSubmissionWhereInput = {};

    if (isPatient) {
      // Patients can only see their own submissions
      where.patientId = requester.patientId ?? undefined;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.patientId && !isPatient) {
      where.patientId = options.patientId;
    }

    return this.prisma.requirementSubmission.findMany({
      where,
      include: { requirement: true, patient: true, document: true, reviewer: { select: { displayName: true, role: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get the status history for a submission.
   */
  async getHistory(submissionId: string, requesterId: string) {
    const submission = await this.prisma.requirementSubmission.findUnique({
      where: { id: submissionId },
      include: { patient: true },
    });
    if (!submission) throw new NotFoundException('Submission not found.');

    // Authorization check
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) throw new NotFoundException('User not found.');

    const isPatient = requester.role === 'PATIENT';
    if (isPatient && submission.patientId !== requester.patientId) {
      throw new ForbiddenException('You are not authorized to view this submission history.');
    }

    return this.stateMachine.getStatusHistory(submissionId);
  }

  /**
   * Get a single submission by ID with authorization check.
   */
  async findOne(submissionId: string, requesterId: string) {
    const submission = await this.prisma.requirementSubmission.findUnique({
      where: { id: submissionId },
      include: { requirement: true, patient: true, document: true, reviewer: { select: { displayName: true, role: true } } },
    });
    if (!submission) throw new NotFoundException('Submission not found.');

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) throw new NotFoundException('User not found.');

    const isPatient = requester.role === 'PATIENT';
    if (isPatient && submission.patientId !== requester.patientId) {
      throw new ForbiddenException('You are not authorized to view this submission.');
    }

    return submission;
  }
}