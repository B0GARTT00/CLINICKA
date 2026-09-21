import { VisitStatus } from '@prisma/client';
import {
  getPermittedTargets,
  isPermittedTransition,
  canCompleteFrom,
  canCancelFrom,
  formatPermittedTargets,
  COMPLETABLE_SOURCES,
  CANCELLABLE_SOURCES,
} from './visit-transitions';

describe('visit-transitions', () => {
  describe('getPermittedTargets', () => {
    it('returns IN_CONSULTATION and CANCELLED for OPEN', () => {
      expect(getPermittedTargets(VisitStatus.OPEN)).toEqual([
        VisitStatus.IN_CONSULTATION,
        VisitStatus.CANCELLED,
      ]);
    });

    it('returns COMPLETED and CANCELLED for IN_CONSULTATION', () => {
      expect(getPermittedTargets(VisitStatus.IN_CONSULTATION)).toEqual([
        VisitStatus.COMPLETED,
        VisitStatus.CANCELLED,
      ]);
    });

    it('returns empty array for COMPLETED (terminal)', () => {
      expect(getPermittedTargets(VisitStatus.COMPLETED)).toEqual([]);
    });

    it('returns empty array for CANCELLED (terminal)', () => {
      expect(getPermittedTargets(VisitStatus.CANCELLED)).toEqual([]);
    });
  });

  describe('isPermittedTransition', () => {
    it('returns true for OPEN -> IN_CONSULTATION', () => {
      expect(isPermittedTransition(VisitStatus.OPEN, VisitStatus.IN_CONSULTATION)).toBe(true);
    });

    it('returns true for OPEN -> CANCELLED', () => {
      expect(isPermittedTransition(VisitStatus.OPEN, VisitStatus.CANCELLED)).toBe(true);
    });

    it('returns true for IN_CONSULTATION -> COMPLETED', () => {
      expect(isPermittedTransition(VisitStatus.IN_CONSULTATION, VisitStatus.COMPLETED)).toBe(true);
    });

    it('returns true for IN_CONSULTATION -> CANCELLED', () => {
      expect(isPermittedTransition(VisitStatus.IN_CONSULTATION, VisitStatus.CANCELLED)).toBe(true);
    });

    it('returns false for OPEN -> COMPLETED (invalid)', () => {
      expect(isPermittedTransition(VisitStatus.OPEN, VisitStatus.COMPLETED)).toBe(false);
    });

    it('returns false for IN_CONSULTATION -> OPEN (backward)', () => {
      expect(isPermittedTransition(VisitStatus.IN_CONSULTATION, VisitStatus.OPEN)).toBe(false);
    });

    it('returns false for COMPLETED -> other states (terminal)', () => {
      expect(isPermittedTransition(VisitStatus.COMPLETED, VisitStatus.OPEN)).toBe(false);
      expect(isPermittedTransition(VisitStatus.COMPLETED, VisitStatus.IN_CONSULTATION)).toBe(false);
      expect(isPermittedTransition(VisitStatus.COMPLETED, VisitStatus.CANCELLED)).toBe(false);
    });

    it('returns false for CANCELLED -> other states (terminal)', () => {
      expect(isPermittedTransition(VisitStatus.CANCELLED, VisitStatus.OPEN)).toBe(false);
      expect(isPermittedTransition(VisitStatus.CANCELLED, VisitStatus.IN_CONSULTATION)).toBe(false);
      expect(isPermittedTransition(VisitStatus.CANCELLED, VisitStatus.COMPLETED)).toBe(false);
    });

    it('returns true for same-status (idempotent)', () => {
      expect(isPermittedTransition(VisitStatus.OPEN, VisitStatus.OPEN)).toBe(true);
      expect(isPermittedTransition(VisitStatus.IN_CONSULTATION, VisitStatus.IN_CONSULTATION)).toBe(true);
      // Terminal states also return true for same-status (idempotent)
      expect(isPermittedTransition(VisitStatus.COMPLETED, VisitStatus.COMPLETED)).toBe(true);
      expect(isPermittedTransition(VisitStatus.CANCELLED, VisitStatus.CANCELLED)).toBe(true);
    });
  });

  describe('canCompleteFrom', () => {
    it('returns true only for IN_CONSULTATION', () => {
      expect(canCompleteFrom(VisitStatus.IN_CONSULTATION)).toBe(true);
      expect(canCompleteFrom(VisitStatus.OPEN)).toBe(false);
      expect(canCompleteFrom(VisitStatus.COMPLETED)).toBe(false);
      expect(canCompleteFrom(VisitStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canCancelFrom', () => {
    it('returns true for OPEN and IN_CONSULTATION', () => {
      expect(canCancelFrom(VisitStatus.OPEN)).toBe(true);
      expect(canCancelFrom(VisitStatus.IN_CONSULTATION)).toBe(true);
    });

    it('returns false for terminal states', () => {
      expect(canCancelFrom(VisitStatus.COMPLETED)).toBe(false);
      expect(canCancelFrom(VisitStatus.CANCELLED)).toBe(false);
    });
  });

  describe('formatPermittedTargets', () => {
    it('formats OPEN targets correctly', () => {
      expect(formatPermittedTargets(VisitStatus.OPEN)).toBe("'IN_CONSULTATION', 'CANCELLED'");
    });

    it('formats IN_CONSULTATION targets correctly', () => {
      expect(formatPermittedTargets(VisitStatus.IN_CONSULTATION)).toBe("'COMPLETED', 'CANCELLED'");
    });

    it('returns terminal message for COMPLETED', () => {
      expect(formatPermittedTargets(VisitStatus.COMPLETED)).toBe('none (terminal state)');
    });

    it('returns terminal message for CANCELLED', () => {
      expect(formatPermittedTargets(VisitStatus.CANCELLED)).toBe('none (terminal state)');
    });
  });

  describe('COMPLETABLE_SOURCES', () => {
    it('contains only IN_CONSULTATION', () => {
      expect(COMPLETABLE_SOURCES).toEqual([VisitStatus.IN_CONSULTATION]);
    });
  });

  describe('CANCELLABLE_SOURCES', () => {
    it('contains OPEN and IN_CONSULTATION', () => {
      expect(CANCELLABLE_SOURCES).toEqual([VisitStatus.OPEN, VisitStatus.IN_CONSULTATION]);
    });
  });
});