import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma/prisma.service';
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
  name: string;
  isActive: boolean;
  semesters: { id: string; name: string; isActive: boolean }[];
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

    const ineligibilityReasons: IneligibilityReason[] = [];
    const evaluatedRequirements = requirements.map((req) => {
      const reason = this.evaluateRequirement(req);
      if (reason) {
        ineligibilityReasons.push(reason);
      }
      return {
        id: req.id,
        name: req.name,
        description: req.description,
        deadline: req.deadline,
        satisfied: reason === null,
      };
    });

    return {
      patientId: patient.id,
      eligible: ineligibilityReasons.length === 0,
      ineligibilityReasons,
      applicableRequirements: evaluatedRequirements,
      evaluatedAt: new Date(),
      academicYear: academicYear ? { id: academicYear.id, name: academicYear.name } : null,
      semester: semester ? { id: semester.id, name: semester.name } : null,
    };
  }

  /**
   * Evaluate a single requirement and return an ineligibility reason if not satisfied.
   */
  private evaluateRequirement(requirement: Requirement): IneligibilityReason | null {
    const submission = requirement.submissions[0];

    if (!submission) {
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        code: IneligibilityReasonCode.NOT_SUBMITTED,
        detail: `Requirement '${requirement.name}' has not been submitted.`,
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

    if (submission.expiresAt && submission.expiresAt <= new Date()) {
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        code: IneligibilityReasonCode.EXPIRED,
        detail: `Requirement '${requirement.name}' expired on ${submission.expiresAt.toISOString().split('T')[0]}.`,
        expiresAt: submission.expiresAt.toISOString(),
      };
    }

    return null;
  }

  private async loadAcademicYear(academicYearId?: string): Promise<AcademicYear | null> {
    if (academicYearId) {
      return this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
        include: { semesters: true },
      });
    }
    return this.prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { semesters: true },
    });
  }

  private selectSemester(
    academicYear: AcademicYear | null,
    semesterId?: string,
  ): { id: string; name: string; isActive: boolean } | null {
    if (!academicYear) return null;
    if (semesterId) {
      return academicYear.semesters.find((s) => s.id === semesterId) ?? null;
    }
    return academicYear.semesters.find((s) => s.isActive) ?? academicYear.semesters[0] ?? null;
  }

  private async loadApplicableRequirements(
    patient: { id: string; type: string },
    academicYear: AcademicYear | null,
    semester: { id: string; name: string; isActive: boolean } | null,
  ): Promise<Requirement[]> {
    const where: Prisma.HealthRequirementWhereInput = {
      archiveStatus: 'ACTIVE',
      OR: [{ applicableTo: patient.type }, { applicableTo: 'ALL' }],
    };

    if (academicYear) {
      where.AND = [
        {
          OR: [{ academicYearId: null }, { academicYearId: academicYear.id }],
        },
      ];
    }

    if (semester) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [{ semesterId: null }, { semesterId: semester.id }],
      });
    }

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
}