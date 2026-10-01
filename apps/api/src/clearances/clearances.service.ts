import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ArchiveStatus, ClearanceStatus, AuditAction, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DeterministicEligibilityEngine } from './eligibility/eligibility-engine';
import { EligibilityResult } from './eligibility/eligibility-types';
import { CreateClearanceDto, RequestClearanceDto, ReviewClearanceDto } from './dto';

type JsonValue = Prisma.InputJsonValue;

@Injectable()
export class ClearancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly eligibilityEngine: DeterministicEligibilityEngine,
  ) {}

  async list(patientId?: string) {
    const clearances = await this.prisma.clearance.findMany({
      where: patientId
        ? { patientId }
        : { archiveStatus: ArchiveStatus.ACTIVE, status: { not: ClearanceStatus.INCOMPLETE } },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            type: true,
            firstName: true,
            lastName: true,
            submissions: {
              include: {
                requirement: true,
                document: { select: { id: true, filename: true, mimeType: true, sizeBytes: true, isPrivate: true } },
                reviewer: { select: { displayName: true } },
              },
              orderBy: { submittedAt: 'desc' },
            },
          },
        },
        academicYear: true,
        semester: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Requirement evidence belongs to the clearance application for the same
    // academic period. Do not leak a patient's historical or future-period
    // submissions into every clearance card.
    return clearances.map((clearance) => ({
      ...clearance,
      patient: {
        ...clearance.patient,
        submissions: clearance.patient.submissions.filter((submission) =>
          submission.requirement.academicYearId === clearance.academicYearId
          && (submission.requirement.semesterId === null
            || submission.requirement.semesterId === clearance.semesterId),
        ),
      },
    }));
  }

  async request(dto: RequestClearanceDto, patientId: string, actorId: string) {
    const eligibility = await this.eligibilityEngine.evaluate(patientId, dto.academicYearId, dto.semesterId);
    if (!eligibility.academicYear) throw new NotFoundException('No academic year context was resolved.');

    const existing = await this.prisma.clearance.findFirst({
      where: {
        patientId,
        type: dto.type,
        academicYearId: eligibility.academicYear.id,
        semesterId: eligibility.semester?.id ?? null,
        status: { in: [ClearanceStatus.PENDING, ClearanceStatus.INCOMPLETE, ClearanceStatus.FOR_REVIEW] },
      },
    });
    if (existing) throw new ConflictException('You already have an active request for this clearance type and academic period.');

    const clearance = await this.prisma.clearance.create({
      data: {
        patientId,
        type: dto.type,
        academicYearId: eligibility.academicYear.id,
        semesterId: eligibility.semester?.id,
        status: ClearanceStatus.INCOMPLETE,
        eligibilityContext: {
          evaluatedAt: eligibility.evaluatedAt.toISOString(),
          academicYear: eligibility.academicYear,
          semester: eligibility.semester,
          applicableRequirements: eligibility.applicableRequirements,
        } as JsonValue,
        ineligibilityReasons: eligibility.ineligibilityReasons.length
          ? (eligibility.ineligibilityReasons as unknown as JsonValue)
          : undefined,
      },
      include: { patient: true, academicYear: true, semester: true },
    });

    await this.audit.record(actorId, AuditAction.CLEARANCE_CREATED, 'Clearance', clearance.id);
    return clearance;
  }

  async submitDraft(id: string, patientId: string, actorId: string) {
    const clearance = await this.prisma.clearance.findUnique({ where: { id } });
    if (!clearance) throw new NotFoundException('Clearance application not found.');
    if (clearance.patientId !== patientId) throw new ForbiddenException('You can only submit your own clearance application.');
    if (clearance.status !== ClearanceStatus.INCOMPLETE) {
      throw new ConflictException('Only an incomplete draft can be submitted for clinic review.');
    }

    const eligibility = await this.eligibilityEngine.evaluate(
      patientId,
      clearance.academicYearId,
      clearance.semesterId ?? undefined,
    );
    if (!eligibility.applicableRequirements.length) {
      throw new BadRequestException('No clearance requirements are configured for this academic period. Contact the clinic.');
    }
    const missing = eligibility.applicableRequirements.filter((requirement) =>
      !requirement.status || ['NOT_SUBMITTED', 'REJECTED', 'EXPIRED'].includes(requirement.status),
    );
    if (missing.length) {
      throw new BadRequestException(`Complete every clearance requirement before submitting. Missing or invalid: ${missing.map((item) => item.name).join(', ')}.`);
    }

    const updated = await this.prisma.clearance.update({
      where: { id },
      data: {
        status: ClearanceStatus.FOR_REVIEW,
        eligibilityContext: {
          evaluatedAt: eligibility.evaluatedAt.toISOString(),
          academicYear: eligibility.academicYear,
          semester: eligibility.semester,
          applicableRequirements: eligibility.applicableRequirements,
        } as JsonValue,
        ineligibilityReasons: eligibility.ineligibilityReasons.length
          ? (eligibility.ineligibilityReasons as unknown as JsonValue)
          : [],
      },
      include: { patient: true, academicYear: true, semester: true },
    });
    await this.audit.record(actorId, AuditAction.CLEARANCE_FOR_REVIEW, 'Clearance', id);
    const reviewers = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', roles: { some: { role: { name: { in: ['ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR'] } } } } },
      select: { id: true },
    });
    if (reviewers.length) {
      await this.prisma.notification.createMany({ data: reviewers.map((reviewer) => ({
        userId: reviewer.id,
        title: 'Clearance application ready for review',
        body: `${updated.patient.firstName} ${updated.patient.lastName} submitted a complete clearance application.`,
        type: NotificationType.CLEARANCE,
        metadata: { href: '/clearances', entityId: id },
      })) });
    }
    return updated;
  }

  async archive(id: string, actorId: string) {
    const clearance = await this.prisma.clearance.findUnique({ where: { id } });
    if (!clearance) throw new NotFoundException('Clearance application not found.');
    const terminalStatuses = new Set<ClearanceStatus>([ClearanceStatus.REJECTED, ClearanceStatus.CLEARED, ClearanceStatus.EXPIRED]);
    if (!terminalStatuses.has(clearance.status)) {
      throw new ConflictException('Only completed, rejected, or expired clearance applications can be archived.');
    }
    const updated = await this.prisma.clearance.update({
      where: { id },
      data: { archiveStatus: ArchiveStatus.ARCHIVED },
    });
    await this.audit.record(actorId, AuditAction.ARCHIVE, 'Clearance', id);
    return updated;
  }

  /**
   * Evaluate eligibility using the deterministic engine.
   *
   * Returns granular ineligibility reasons for each unmet requirement,
   * including status, expiration, and temporal alignment details.
   */
  async eligibility(patientId: string, academicYearId?: string, semesterId?: string): Promise<EligibilityResult> {
    return this.eligibilityEngine.evaluate(patientId, academicYearId, semesterId);
  }

  /**
   * Create a clearance request.
   *
   * The eligibility context (academic year, semester, evaluated requirements,
   * and ineligibility reasons) is captured at creation time and stored on the
   * clearance record for integrity enforcement during review.
   */
  async create(dto: CreateClearanceDto, actorId: string) {
    // Evaluate eligibility for the specified academic year/semester
    const eligibility = await this.eligibilityEngine.evaluate(dto.patientId, dto.academicYearId, dto.semesterId);
    if (!eligibility.academicYear) throw new NotFoundException('No academic year context was resolved.');

    const clearance = await this.prisma.clearance.create({
      data: {
        patientId: eligibility.patientId,
        type: dto.type,
        academicYearId: eligibility.academicYear.id,
        semesterId: eligibility.semester?.id,
        status: eligibility.eligible ? ClearanceStatus.FOR_REVIEW : ClearanceStatus.INCOMPLETE,
        eligibilityContext: {
          evaluatedAt: eligibility.evaluatedAt.toISOString(),
          academicYear: eligibility.academicYear,
          semester: eligibility.semester,
          applicableRequirements: eligibility.applicableRequirements,
        } as JsonValue,
        ineligibilityReasons: eligibility.ineligibilityReasons.length > 0
          ? (eligibility.ineligibilityReasons as unknown as JsonValue)
          : undefined,
      },
      include: { patient: true, academicYear: true, semester: true },
    });

    await this.audit.record(actorId, AuditAction.CLEARANCE_CREATED, 'Clearance', clearance.id);
    return clearance;
  }

  /**
   * Review a clearance, enforcing integrity constraints.
   *
   * A clearance can only be issued (CLEARED) if:
   *   1. The eligibility context was captured at creation time
   *   2. No ineligibility reasons were recorded
   *   3. Re-evaluation confirms eligibility is still valid
   */
  async review(id: string, dto: ReviewClearanceDto, actorId: string) {
    const clearance = await this.prisma.clearance.findUnique({ where: { id } });
    if (!clearance) throw new NotFoundException('Clearance not found.');

    // Integrity constraint: cannot issue if ineligible
    if (dto.status === ClearanceStatus.CLEARED) {
      // Re-evaluate to ensure eligibility is still valid
      const currentEligibility = await this.eligibilityEngine.evaluate(
        clearance.patientId,
        clearance.academicYearId,
        clearance.semesterId ?? undefined,
      );

      if (!currentEligibility.eligible) {
        throw new ForbiddenException(
          `Cannot issue clearance: patient is ineligible. Reasons: ${currentEligibility.ineligibilityReasons
            .map((r) => r.detail)
            .join('; ')}`,
        );
      }

      // Capture context on issuance
      const updated = await this.prisma.clearance.update({
        where: { id },
        data: {
          status: ClearanceStatus.CLEARED,
          remarks: dto.remarks,
          issuedById: actorId,
          issuedAt: new Date(),
          eligibilityContext: {
            evaluatedAt: currentEligibility.evaluatedAt.toISOString(),
            academicYear: currentEligibility.academicYear,
            semester: currentEligibility.semester,
            applicableRequirements: currentEligibility.applicableRequirements,
            issuedAt: new Date().toISOString(),
            issuedBy: actorId,
          } as JsonValue,
          ineligibilityReasons: [],
        },
        include: { patient: true, academicYear: true, semester: true },
      });

      const statusAction = `CLEARANCE_${dto.status}` as AuditAction;
      await this.audit.record(actorId, statusAction, 'Clearance', id);
      await this.notifyPatientOfDecision(clearance.patientId, id, dto.status, dto.remarks);
      return updated;
    }

    // For non-CLEARED statuses (PENDING, REJECTED, INCOMPLETE)
    const updated = await this.prisma.clearance.update({
      where: { id },
      data: {
        status: dto.status,
        remarks: dto.remarks,
      },
      include: { patient: true, academicYear: true, semester: true },
    });

    const statusAction = `CLEARANCE_${dto.status}` as AuditAction;
    await this.audit.record(actorId, statusAction, 'Clearance', id);
    if (dto.status === ClearanceStatus.REJECTED) {
      await this.notifyPatientOfDecision(clearance.patientId, id, dto.status, dto.remarks);
    }
    return updated;
  }

  private async notifyPatientOfDecision(patientId: string, clearanceId: string, status: ClearanceStatus, remarks?: string) {
    const user = await this.prisma.user.findFirst({ where: { patientId, status: 'ACTIVE' }, select: { id: true } });
    if (!user) return;
    await this.prisma.notification.create({ data: {
      userId: user.id,
      title: status === ClearanceStatus.CLEARED ? 'Medical clearance approved' : 'Clearance application update',
      body: status === ClearanceStatus.CLEARED
        ? 'Your medical clearance has been approved.'
        : `Your clearance application was rejected.${remarks ? ` Clinic remarks: ${remarks}` : ''}`,
      type: NotificationType.CLEARANCE,
      metadata: { href: '/clearances', entityId: clearanceId },
    } });
  }

  /**
   * Get the eligibility context for a clearance, including ineligibility reasons.
   */
  async getEligibilityContext(id: string) {
    const clearance = await this.prisma.clearance.findUnique({ where: { id } });
    if (!clearance) throw new NotFoundException('Clearance not found.');
    return {
      eligibilityContext: clearance.eligibilityContext,
      ineligibilityReasons: clearance.ineligibilityReasons,
      status: clearance.status,
    };
  }
}
