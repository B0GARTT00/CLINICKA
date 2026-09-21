/**
 * Submission status lifecycle for evidence submissions.
 *
 * SUBMITTED ──(review VERIFIED)──▶ VERIFIED  (terminal)
 * SUBMITTED ──(review REJECTED)──▶ REJECTED
 * REJECTED  ──(resubmit)────────▶ SUBMITTED
 * VERIFIED  ──(terminal)
 */
export enum EvidenceStatus {
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

/**
 * Canonical evidence submission status transition table.
 */
export const EVIDENCE_STATUS_TRANSITIONS: Readonly<Record<EvidenceStatus, readonly EvidenceStatus[]>> = {
  [EvidenceStatus.SUBMITTED]: [EvidenceStatus.VERIFIED, EvidenceStatus.REJECTED],
  [EvidenceStatus.VERIFIED]: [],
  [EvidenceStatus.REJECTED]: [EvidenceStatus.SUBMITTED],
};

/**
 * Returns the permitted target statuses for a given state.
 */
export function getPermittedEvidenceTargets(current: EvidenceStatus): readonly EvidenceStatus[] {
  return EVIDENCE_STATUS_TRANSITIONS[current] ?? [];
}

/**
 * Returns true when a transition from `current` to `next` is permitted.
 */
export function isPermittedEvidenceTransition(current: EvidenceStatus, next: EvidenceStatus): boolean {
  if (current === next) return true;
  return getPermittedEvidenceTargets(current).includes(next);
}

/**
 * Returns true when a submission is in a terminal state.
 */
export function isTerminalEvidenceStatus(status: EvidenceStatus): boolean {
  return getPermittedEvidenceTargets(status).length === 0;
}

/**
 * Returns the human-readable list of permitted target statuses for a state.
 */
export function formatPermittedEvidenceTargets(current: EvidenceStatus): string {
  const targets = getPermittedEvidenceTargets(current);
  return targets.length === 0 ? 'none (terminal state)' : targets.map(s => `'${s}'`).join(', ');
}