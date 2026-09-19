import { UnprocessableEntityException } from '@nestjs/common';
import { EvidenceStatus } from './evidence-transitions';

export class InvalidEvidenceTransitionException extends UnprocessableEntityException {
  constructor(current: EvidenceStatus, attempted: EvidenceStatus) {
    super(
      `Invalid evidence status transition: cannot move from '${current}' to '${attempted}'. ` +
      `Permitted transitions from '${current}': ${formatPermittedTargets(current)}.`,
    );
  }
}

export class EvidenceAlreadySubmittedException extends UnprocessableEntityException {
  constructor(requirementId: string, patientId: string) {
    super(
      `Evidence for requirement '${requirementId}' has already been submitted by patient '${patientId}'. ` +
      `A new submission can only be created after the previous one has been rejected.`,
    );
  }
}

export class EvidenceAlreadyVerifiedException extends UnprocessableEntityException {
  constructor() {
    super('Evidence has already been verified and cannot be modified.');
  }
}

export class EvidenceAlreadyRejectedException extends UnprocessableEntityException {
  constructor() {
    super('Evidence has already been rejected and cannot be modified.');
  }
}

export class UnauthorizedEvidenceAccessException extends UnprocessableEntityException {
  constructor() {
    super('You are not authorized to access this evidence submission.');
  }
}

function formatPermittedTargets(current: EvidenceStatus): string {
  const targets: EvidenceStatus[] = current === EvidenceStatus.SUBMITTED
    ? [EvidenceStatus.VERIFIED, EvidenceStatus.REJECTED]
    : current === EvidenceStatus.REJECTED
      ? [EvidenceStatus.SUBMITTED]
      : [];
  return targets.length === 0 ? 'none (terminal state)' : targets.map(s => `'${s}'`).join(', ');
}