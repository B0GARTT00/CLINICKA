import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IneligibilityReasonCode, EligibilityResult, IneligibilityReason } from './eligibility-types';

type Submission = {
  id: string;
  status: string;
  expiresAt: Date | null;
  reviewedAt: Date | null;
};

type Requirement = {
  id: string;
  name: string;
  description: string | null;
  deadline: Date | null;
  applicableTo: string;
  academicYearId: string | null;
  semesterId: string | null;
  submissions: Submission[];
};

type AcademicYear = {
  id: string;
  label: string;
  isActive: boolean;
  semesters: { id: string; label: string; isActive: boolean }[];
};

/**
 * DeterministicEligibilityEngine
 *
 * Evaluates patient eligibility for clearance by applying strict rule validation.
 * Every decision is deterministic: given the same patient, academic year, and
 * semester, the engine always produces the same result.
 */
@Injectable()
export class DeterministicEligibilityEngine {
  private readonly logger = new Logger(DeterministicEligibilityEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate eligibility for a patient against a specific academic year and semester.
   */
  async evaluate(
    patientId: string,
    academicYearId?: string,
    semesterId?: string,
  ): Promise<EligibilityResult & { patientId: string }> {
    const patient = await this.prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { patientNumber: patientId }], deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Active patient not found.');

    const academicYear = await this.loadAcademicYear(academicYearId);
    const semester = this.selectSemester(academicYear, semesterId);

    const requirements = await this.loadApplicableRequirements(patient, academicYear, semester);
    const evaluatedAt = new Date();

    const ineligibilityReasons: IneligibilityReason[] = [];
    const evaluatedRequirements = requirements.map((req) => {
      const reason = this.evaluateRequirement(req, evaluatedAt);
      if (reason) {
        ineligibilityReasons.push(reason);
      }
      return {
        id: req.id,
        name: req.name,
        description: req.description,
        deadline: req.deadline,
        satisfied: reason === null,
        status: req.submissions[0]?.status ?? null,
        reasonCode: reason?.code,
        reason: reason?.detail,
      };
    });

    return {
      patientId: patient.id,
      eligible: ineligibilityReasons.length === 0,
      ineligibilityReasons,
      applicableRequirements: evaluatedRequirements,
      evaluatedAt,
      academicYear: academicYear ? { id: academicYear.id, name: academicYear.label } : null,
      semester: semester ? { id: semester.id, name: semester.label } : null,
    };
  }

  /**
   * Evaluate a single requirement and return an ineligibility reason if not satisfied.
   */
  private evaluateRequirement(requirement: Requirement, evaluatedAt: Date): IneligibilityReason | null {
    const submission = requirement.submissions[0];

    if (!submission) {
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        code: IneligibilityReasonCode.NOT_SUBMITTED,
        detail: `Requirement '${requirement.name}' has not been submitted.`,
      };
    }

    if (submission.status === 'EXPIRED' || (submission.expiresAt && submission.expiresAt <= evaluatedAt)) {
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        code: IneligibilityReasonCode.EXPIRED,
        detail: submission.expiresAt
          ? `Requirement '${requirement.name}' expired on ${submission.expiresAt.toISOString().split('T')[0]}.`
          : `Requirement '${requirement.name}' is marked expired.`,
        currentStatus: submission.status,
        expiresAt: submission.expiresAt?.toISOString(),
      };
    }

    if (submission.status !== 'VERIFIED') {
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        code: IneligibilityReasonCode.NOT_VERIFIED,
        detail: `Requirement '${requirement.name}' is ${submission.status.toLowerCase()}.`,
        currentStatus: submission.status,
      };
    }

    return null;
  }

  private async loadAcademicYear(academicYearId?: string): Promise<AcademicYear | null> {
    if (academicYearId) {
      const academicYear = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
        include: { semesters: true },
      });
      if (!academicYear) throw new NotFoundException('Academic year not found.');
      return academicYear;
    }
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { semesters: true },
    });
    if (!academicYear) throw new NotFoundException('No active academic year configured.');
    return academicYear;
  }

  private selectSemester(
    academicYear: AcademicYear | null,
    semesterId?: string,
  ): { id: string; label: string; isActive: boolean } | null {
    if (!academicYear) return null;
    if (semesterId) {
      const semester = academicYear.semesters.find((s) => s.id === semesterId);
      if (!semester) throw new BadRequestException('Semester does not belong to the selected academic year.');
      return semester;
    }
    return academicYear.semesters.find((s) => s.isActive) ?? null;
  }

  private async loadApplicableRequirements(
    patient: { id: string; type: string },
    academicYear: AcademicYear | null,
    semester: { id: string; label: string; isActive: boolean } | null,
  ): Promise<Requirement[]> {
    const where: Prisma.HealthRequirementWhereInput = {
      archiveStatus: 'ACTIVE',
      applicableTo: { in: this.applicableScopes(patient.type) },
    };

    const contextFilters: Prisma.HealthRequirementWhereInput[] = [];

    if (academicYear) contextFilters.push({ academicYearId: academicYear.id });

    if (semester) {
      contextFilters.push({
        OR: [{ semesterId: null }, { semesterId: semester.id }],
      });
    } else contextFilters.push({ semesterId: null });

    if (contextFilters.length > 0) where.AND = contextFilters;

    return this.prisma.healthRequirement.findMany({
      where,
      include: {
        submissions: {
          where: { patientId: patient.id },
          take: 1,
          orderBy: { submittedAt: 'desc' },
        },
      },
    }) as unknown as Requirement[];
  }

  private applicableScopes(patientType: string) {
    if (patientType === 'STUDENT') return ['ALL', 'STUDENT', 'COLLEGE'];
    if (patientType === 'FACULTY') return ['ALL', 'FACULTY', 'FACULTY_STAFF'];
    if (patientType === 'STAFF') return ['ALL', 'STAFF', 'FACULTY_STAFF'];
    return ['ALL', patientType];
  }
}
