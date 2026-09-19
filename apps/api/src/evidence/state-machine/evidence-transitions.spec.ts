import { EvidenceStatus } from './evidence-transitions';
import {
  getPermittedEvidenceTargets,
  isPermittedEvidenceTransition,
  isTerminalEvidenceStatus,
  formatPermittedEvidenceTargets,
  EVIDENCE_STATUS_TRANSITIONS,
} from './evidence-transitions';

describe('evidence-transitions', () => {
  describe('getPermittedEvidenceTargets', () => {
    it('returns VERIFIED and REJECTED for SUBMITTED', () => {
      expect(getPermittedEvidenceTargets(EvidenceStatus.SUBMITTED)).toEqual([
        EvidenceStatus.VERIFIED,
        EvidenceStatus.REJECTED,
      ]);
    });

    it('returns empty array for VERIFIED (terminal)', () => {
      expect(getPermittedEvidenceTargets(EvidenceStatus.VERIFIED)).toEqual([]);
    });

    it('returns SUBMITTED for REJECTED', () => {
      expect(getPermittedEvidenceTargets(EvidenceStatus.REJECTED)).toEqual([
        EvidenceStatus.SUBMITTED,
      ]);
    });
  });

  describe('isPermittedEvidenceTransition', () => {
    it('returns true for SUBMITTED -> VERIFIED', () => {
      expect(isPermittedEvidenceTransition(EvidenceStatus.SUBMITTED, EvidenceStatus.VERIFIED)).toBe(true);
    });

    it('returns true for SUBMITTED -> REJECTED', () => {
      expect(isPermittedEvidenceTransition(EvidenceStatus.SUBMITTED, EvidenceStatus.REJECTED)).toBe(true);
    });

    it('returns true for REJECTED -> SUBMITTED', () => {
      expect(isPermittedEvidenceTransition(EvidenceStatus.REJECTED, EvidenceStatus.SUBMITTED)).toBe(true);
    });

    it('returns false for VERIFIED -> REJECTED (terminal)', () => {
      expect(isPermittedEvidenceTransition(EvidenceStatus.VERIFIED, EvidenceStatus.REJECTED)).toBe(false);
    });

    it('returns false for VERIFIED -> SUBMITTED (terminal)', () => {
      expect(isPermittedEvidenceTransition(EvidenceStatus.VERIFIED, EvidenceStatus.SUBMITTED)).toBe(false);
    });

    it('returns false for REJECTED -> VERIFIED', () => {
      expect(isPermittedEvidenceTransition(EvidenceStatus.REJECTED, EvidenceStatus.VERIFIED)).toBe(false);
    });

    it('returns true for same-status (idempotent)', () => {
      expect(isPermittedEvidenceTransition(EvidenceStatus.SUBMITTED, EvidenceStatus.SUBMITTED)).toBe(true);
      expect(isPermittedEvidenceTransition(EvidenceStatus.VERIFIED, EvidenceStatus.VERIFIED)).toBe(true);
    });
  });

  describe('isTerminalEvidenceStatus', () => {
    it('returns true for VERIFIED', () => {
      expect(isTerminalEvidenceStatus(EvidenceStatus.VERIFIED)).toBe(true);
    });

    it('returns false for SUBMITTED and REJECTED', () => {
      expect(isTerminalEvidenceStatus(EvidenceStatus.SUBMITTED)).toBe(false);
      expect(isTerminalEvidenceStatus(EvidenceStatus.REJECTED)).toBe(false);
    });
  });

  describe('formatPermittedEvidenceTargets', () => {
    it('formats SUBMITTED targets', () => {
      expect(formatPermittedEvidenceTargets(EvidenceStatus.SUBMITTED)).toBe("'VERIFIED', 'REJECTED'");
    });

    it('returns terminal message for VERIFIED', () => {
      expect(formatPermittedEvidenceTargets(EvidenceStatus.VERIFIED)).toBe('none (terminal state)');
    });
  });

  describe('EVIDENCE_STATUS_TRANSITIONS', () => {
    it('has correct structure', () => {
      expect(EVIDENCE_STATUS_TRANSITIONS).toEqual({
        [EvidenceStatus.SUBMITTED]: [EvidenceStatus.VERIFIED, EvidenceStatus.REJECTED],
        [EvidenceStatus.VERIFIED]: [],
        [EvidenceStatus.REJECTED]: [EvidenceStatus.SUBMITTED],
      });
    });
  });
});