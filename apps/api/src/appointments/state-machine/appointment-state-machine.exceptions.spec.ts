import { AppointmentStatus } from '@prisma/client';
import {
  AppointmentAlreadyTerminalException,
  AppointmentCannotCheckInFromCurrentStatusException,
  AppointmentVisitAlreadyExistsException,
  InvalidAppointmentTransitionException,
} from './appointment-state-machine.exceptions';

describe('appointment-state-machine.exceptions', () => {
  describe('InvalidAppointmentTransitionException', () => {
    it('creates descriptive message for PENDING -> COMPLETED', () => {
      const error = new InvalidAppointmentTransitionException(AppointmentStatus.PENDING, AppointmentStatus.COMPLETED);
      expect(error.message).toContain("cannot move appointment from 'PENDING' to 'COMPLETED'");
      expect(error.message).toContain("'APPROVED', 'CANCELLED'");
    });

    it('creates terminal message for CANCELLED -> CHECKED_IN', () => {
      const error = new InvalidAppointmentTransitionException(AppointmentStatus.CANCELLED, AppointmentStatus.CHECKED_IN);
      expect(error.message).toContain("terminal state");
    });
  });

  describe('AppointmentAlreadyTerminalException', () => {
    it('has correct message', () => {
      const error = new AppointmentAlreadyTerminalException(AppointmentStatus.COMPLETED);
      expect(error.message).toBe("Appointment is already in the 'COMPLETED' state and cannot be transitioned further.");
    });
  });

  describe('AppointmentCannotCheckInFromCurrentStatusException', () => {
    it('creates descriptive message for PENDING', () => {
      const error = new AppointmentCannotCheckInFromCurrentStatusException(AppointmentStatus.PENDING);
      expect(error.message).toContain("current status is 'PENDING'");
      expect(error.message).toContain("'APPROVED' or 'CONFIRMED'");
    });
  });

  describe('AppointmentVisitAlreadyExistsException', () => {
    it('creates descriptive message', () => {
      const error = new AppointmentVisitAlreadyExistsException('apt-123', 'visit-456');
      expect(error.message).toContain("Visit 'visit-456' was created for appointment 'apt-123'");
    });
  });
});