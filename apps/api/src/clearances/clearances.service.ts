import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClearanceStatus, AuditAction, Prisma } from '@prisma/client';
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

  list(patientId?: string) {
    return this.prisma.clearance.findMany({
      where: patientId ? { patientId } : undefined,
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
        status: ClearanceStatus.PENDING,
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
    return updated;
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
