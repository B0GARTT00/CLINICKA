import { AppointmentStatus } from '@prisma/client';
import {
  getPermittedTargets,
  isPermittedTransition,
  canCheckInFrom,
  isActiveStatus,
  isTerminalStatus,
  formatPermittedTargets,
  CHECKIN_SOURCES,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
} from './appointment-transitions';

describe('appointment-transitions', () => {
  describe('getPermittedTargets', () => {
    it('returns APPROVED and CANCELLED for PENDING', () => {
      expect(getPermittedTargets(AppointmentStatus.PENDING)).toEqual([
        AppointmentStatus.APPROVED,
        AppointmentStatus.CANCELLED,
      ]);
    });

    it('returns CONFIRMED, CHECKED_IN, CANCELLED for APPROVED', () => {
      expect(getPermittedTargets(AppointmentStatus.APPROVED)).toEqual([
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.CANCELLED,
      ]);
    });

    it('returns CHECKED_IN, CANCELLED, NO_SHOW for CONFIRMED', () => {
      expect(getPermittedTargets(AppointmentStatus.CONFIRMED)).toEqual([
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ]);
    });

    it('returns COMPLETED and NO_SHOW for CHECKED_IN', () => {
      expect(getPermittedTargets(AppointmentStatus.CHECKED_IN)).toEqual([
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
      ]);
    });

    it('returns empty array for terminal states', () => {
      expect(getPermittedTargets(AppointmentStatus.COMPLETED)).toEqual([]);
      expect(getPermittedTargets(AppointmentStatus.CANCELLED)).toEqual([]);
      expect(getPermittedTargets(AppointmentStatus.NO_SHOW)).toEqual([]);
      expect(getPermittedTargets(AppointmentStatus.RESCHEDULED)).toEqual([]);
    });
  });

  describe('isPermittedTransition', () => {
    it('returns true for valid transitions', () => {
      expect(isPermittedTransition(AppointmentStatus.PENDING, AppointmentStatus.APPROVED)).toBe(true);
      expect(isPermittedTransition(AppointmentStatus.APPROVED, AppointmentStatus.CHECKED_IN)).toBe(true);
      expect(isPermittedTransition(AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN)).toBe(true);
      expect(isPermittedTransition(AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED)).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      expect(isPermittedTransition(AppointmentStatus.PENDING, AppointmentStatus.COMPLETED)).toBe(false);
      expect(isPermittedTransition(AppointmentStatus.CANCELLED, AppointmentStatus.CHECKED_IN)).toBe(false);
      expect(isPermittedTransition(AppointmentStatus.COMPLETED, AppointmentStatus.PENDING)).toBe(false);
      expect(isPermittedTransition(AppointmentStatus.NO_SHOW, AppointmentStatus.PENDING)).toBe(false);
      expect(isPermittedTransition(AppointmentStatus.RESCHEDULED, AppointmentStatus.PENDING)).toBe(false);
    });

    it('returns true for same-status (idempotent)', () => {
      expect(isPermittedTransition(AppointmentStatus.PENDING, AppointmentStatus.PENDING)).toBe(true);
      expect(isPermittedTransition(AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED)).toBe(true);
    });
  });

  describe('canCheckInFrom', () => {
    it('returns true for APPROVED and CONFIRMED', () => {
      expect(canCheckInFrom(AppointmentStatus.APPROVED)).toBe(true);
      expect(canCheckInFrom(AppointmentStatus.CONFIRMED)).toBe(true);
    });

    it('returns false for other states', () => {
      expect(canCheckInFrom(AppointmentStatus.PENDING)).toBe(false);
      expect(canCheckInFrom(AppointmentStatus.CHECKED_IN)).toBe(false);
      expect(canCheckInFrom(AppointmentStatus.COMPLETED)).toBe(false);
      expect(canCheckInFrom(AppointmentStatus.CANCELLED)).toBe(false);
      expect(canCheckInFrom(AppointmentStatus.NO_SHOW)).toBe(false);
      expect(canCheckInFrom(AppointmentStatus.RESCHEDULED)).toBe(false);
    });
  });

  describe('isActiveStatus', () => {
    it('returns true for active states', () => {
      expect(isActiveStatus(AppointmentStatus.PENDING)).toBe(true);
      expect(isActiveStatus(AppointmentStatus.APPROVED)).toBe(true);
      expect(isActiveStatus(AppointmentStatus.CONFIRMED)).toBe(true);
      expect(isActiveStatus(AppointmentStatus.CHECKED_IN)).toBe(true);
    });

    it('returns false for terminal states', () => {
      expect(isActiveStatus(AppointmentStatus.COMPLETED)).toBe(false);
      expect(isActiveStatus(AppointmentStatus.CANCELLED)).toBe(false);
      expect(isActiveStatus(AppointmentStatus.NO_SHOW)).toBe(false);
      expect(isActiveStatus(AppointmentStatus.RESCHEDULED)).toBe(false);
    });
  });

  describe('isTerminalStatus', () => {
    it('returns true for terminal states', () => {
      expect(isTerminalStatus(AppointmentStatus.COMPLETED)).toBe(true);
      expect(isTerminalStatus(AppointmentStatus.CANCELLED)).toBe(true);
      expect(isTerminalStatus(AppointmentStatus.NO_SHOW)).toBe(true);
      expect(isTerminalStatus(AppointmentStatus.RESCHEDULED)).toBe(true);
    });

    it('returns false for active states', () => {
      expect(isTerminalStatus(AppointmentStatus.PENDING)).toBe(false);
      expect(isTerminalStatus(AppointmentStatus.APPROVED)).toBe(false);
      expect(isTerminalStatus(AppointmentStatus.CONFIRMED)).toBe(false);
      expect(isTerminalStatus(AppointmentStatus.CHECKED_IN)).toBe(false);
    });
  });

  describe('formatPermittedTargets', () => {
    it('formats PENDING targets', () => {
      expect(formatPermittedTargets(AppointmentStatus.PENDING)).toBe("'APPROVED', 'CANCELLED'");
    });

    it('returns terminal message for COMPLETED', () => {
      expect(formatPermittedTargets(AppointmentStatus.COMPLETED)).toBe('none (terminal state)');
    });
  });

  describe('CHECKIN_SOURCES', () => {
    it('contains APPROVED and CONFIRMED', () => {
      expect(CHECKIN_SOURCES).toEqual([
        AppointmentStatus.APPROVED,
        AppointmentStatus.CONFIRMED,
      ]);
    });
  });

  describe('ACTIVE_STATUSES', () => {
    it('contains active states', () => {
      expect(ACTIVE_STATUSES).toEqual([
        AppointmentStatus.PENDING,
        AppointmentStatus.APPROVED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CHECKED_IN,
      ]);
    });
  });

  describe('TERMINAL_STATUSES', () => {
    it('contains terminal states', () => {
      expect(TERMINAL_STATUSES).toEqual([
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.RESCHEDULED,
      ]);
    });
  });
});