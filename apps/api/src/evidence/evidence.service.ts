import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EvidenceSubmissionStateMachine } from './state-machine/evidence-state-machine';
import { EvidenceStatus } from './state-machine/evidence-transitions';
import { EvidenceAlreadySubmittedException } from './state-machine/evidence-state-machine.exceptions';
import { DocumentsService } from '../documents/documents.service';
const documentSelection = {
  id: true,
  filename: true,
  mimeType: true,
  sizeBytes: true,
  isPrivate: true,
  createdAt: true,
} as const;

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
    private readonly documents: DocumentsService,
  ) {}

  async uploadAndSubmit(
    requirementId: string,
    patientId: string,
    actorId: string,
    upload: { filename: string; mimeType: string; contentBase64: string; expiresAt?: Date },
  ) {
    const document = await this.documents.create(patientId, actorId, upload, 'evidence');
    try {
      const existing = await this.prisma.requirementSubmission.findUnique({
        where: { requirementId_patientId: { requirementId, patientId } },
      });

      if (existing && existing.status !== EvidenceStatus.REJECTED) {
        throw new EvidenceAlreadySubmittedException(requirementId, patientId);
      }

      if (existing) {
        await this.prisma.requirementSubmission.update({
          where: { id: existing.id },
          data: { documentId: document.id, expiresAt: upload.expiresAt, notes: null, reviewerId: null, reviewedAt: null },
        });
        await this.stateMachine.transition(existing.id, EvidenceStatus.SUBMITTED, actorId, {
          notes: 'Replacement evidence submitted after rejection',
        });
        return this.findOne(existing.id, actorId);
      }

      return await this.submit(requirementId, document.id, patientId, actorId, { expiresAt: upload.expiresAt });
    } catch (error) {
      await this.documents.purgeUnlinked(document.id);
      throw error;
    }
  }

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
    const applicableScopes = patient.type === 'STUDENT'
      ? ['ALL', 'STUDENT', 'COLLEGE']
      : patient.type === 'FACULTY'
        ? ['ALL', 'FACULTY', 'FACULTY_STAFF']
        : ['ALL', 'STAFF', 'FACULTY_STAFF'];
    if (!applicableScopes.includes(requirement.applicableTo)) {
      throw new ForbiddenException('This health requirement does not apply to this patient.');
    }
    if (patient.id !== patientId) {
      throw new ForbiddenException('Patients can only submit evidence for their own requirements.');
    }

    // Verify the document exists and belongs to the patient
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found.');
    if (document.patientId !== patientId || !document.isPrivate) {
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
      include: { requirement: true, patient: true, document: { select: documentSelection } },
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
    const reviewer = await this.loadUserWithRoles(reviewerId);
    if (!reviewer) throw new NotFoundException('Reviewer not found.');

    const authorizedRoles = ['ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR'];
    if (!this.hasAnyRole(reviewer, authorizedRoles)) {
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
    const requester = await this.loadUserWithRoles(requesterId);
    if (!requester) throw new NotFoundException('User not found.');

    const isPatient = this.isPatientOnly(requester);
    const where: Prisma.RequirementSubmissionWhereInput = {};

    if (isPatient) {
      if (!requester.patientId) throw new ForbiddenException('Your account is not linked to a patient record.');
      // Patients can only see their own submissions
      where.patientId = requester.patientId;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.patientId && !isPatient) {
      where.patientId = options.patientId;
    }

    return this.prisma.requirementSubmission.findMany({
      where,
      include: { requirement: true, patient: true, document: { select: documentSelection }, reviewer: { select: { displayName: true, roles: { select: { role: { select: { name: true } } } } } } },
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
    const requester = await this.loadUserWithRoles(requesterId);
    if (!requester) throw new NotFoundException('User not found.');

    const isPatient = this.isPatientOnly(requester);
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
      include: { requirement: true, patient: true, document: { select: documentSelection }, reviewer: { select: { displayName: true, roles: { select: { role: { select: { name: true } } } } } } },
    });
    if (!submission) throw new NotFoundException('Submission not found.');

    const requester = await this.loadUserWithRoles(requesterId);
    if (!requester) throw new NotFoundException('User not found.');

    const isPatient = this.isPatientOnly(requester);
    if (isPatient && submission.patientId !== requester.patientId) {
      throw new ForbiddenException('You are not authorized to view this submission.');
    }

    return submission;
  }

  async getDocument(submissionId: string, requesterId: string) {
    const submission = await this.prisma.requirementSubmission.findUnique({
      where: { id: submissionId },
      include: { document: true },
    });
    if (!submission?.document) throw new NotFoundException('Evidence document not found.');

    const requester = await this.loadUserWithRoles(requesterId);
    if (!requester) throw new NotFoundException('User not found.');
    const canReview = this.hasAnyRole(requester, ['ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR']);
    if (!canReview && requester.patientId !== submission.patientId) {
      throw new ForbiddenException('You are not authorized to access this evidence document.');
    }

    return this.documents.download(submission.document.id, requesterId);
  }

  private loadUserWithRoles(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
  }

  private hasAnyRole(
    user: { roles: { role: { name: string } }[] },
    allowedRoles: string[],
  ) {
    return user.roles.some(({ role }) => allowedRoles.includes(role.name));
  }

  private isPatientOnly(user: { roles: { role: { name: string } }[] }) {
    const clinicalRoles = ['ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR'];
    return !this.hasAnyRole(user, clinicalRoles) && this.hasAnyRole(user, ['STUDENT', 'FACULTY_STAFF']);
  }
}
