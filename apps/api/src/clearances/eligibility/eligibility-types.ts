/**
 * Ineligibility reason codes for deterministic eligibility evaluation.
 */
export enum IneligibilityReasonCode {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  NOT_VERIFIED = 'NOT_VERIFIED',
  EXPIRED = 'EXPIRED',
  WRONG_PERIOD = 'WRONG_PERIOD',
}

/**
 * A single ineligibility reason returned by the eligibility engine.
 */
export interface IneligibilityReason {
  requirementId: string;
  requirementName: string;
  code: IneligibilityReasonCode;
  detail: string;
  expiresAt?: string | null;
  currentStatus?: string;
}

/**
 * Result of an eligibility evaluation.
 */
export interface EligibilityResult {
  eligible: boolean;
  ineligibilityReasons: IneligibilityReason[];
  applicableRequirements: {
    id: string;
    name: string;
    description: string | null;
    deadline: Date | null;
    satisfied: boolean;
  }[];
  evaluatedAt: Date;
  academicYear: { id: string; name: string } | null;
  semester: { id: string; name: string } | null;
}