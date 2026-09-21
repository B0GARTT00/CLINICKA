import { UnprocessableEntityException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import {
  formatPermittedTargets,
  getPermittedTargets,
} from './appointment-transitions';

export class InvalidAppointmentTransitionException extends UnprocessableEntityException {
  constructor(current: AppointmentStatus, attempted: AppointmentStatus) {
    super(
      `Invalid appointment status transition: cannot move appointment from '${current}' to '${attempted}'. ` +
      `Permitted transitions from '${current}' are: ${formatPermittedTargets(current)}.`,
    );
  }
}

export class AppointmentAlreadyTerminalException extends UnprocessableEntityException {
  constructor(current: AppointmentStatus) {
    super(
      `Appointment is already in the '${current}' state and cannot be transitioned further.`,
    );
  }
}

export class AppointmentCannotCheckInFromCurrentStatusException extends UnprocessableEntityException {
  constructor(current: AppointmentStatus) {
    super(
      `Cannot check in appointment: current status is '${current}'. ` +
      `An appointment may only be checked in from the 'APPROVED' or 'CONFIRMED' status.`,
    );
  }
}

export class AppointmentVisitAlreadyExistsException extends UnprocessableEntityException {
  constructor(appointmentId: string, visitId: string) {
    super(
      `Appointment has already been checked in. Visit '${visitId}' was created for appointment '${appointmentId}'.`,
    );
  }
}

export class AppointmentOverlapException extends UnprocessableEntityException {
  constructor(providerName: string, scheduledAt: Date, existingAppointmentId: string) {
    super(
      `Appointment overlaps with existing booking for provider '${providerName}' at ${scheduledAt.toISOString()}. ` +
      `Conflicting appointment: ${existingAppointmentId}. Available capacity: 0/1.`,
    );
  }
}

export class AppointmentCapacityExceededException extends UnprocessableEntityException {
  constructor(providerName: string, scheduledAt: Date, currentCount: number, maxCapacity: number) {
    super(
      `Appointment capacity exceeded for provider '${providerName}' at ${scheduledAt.toISOString()}. ` +
      `Current bookings: ${currentCount}/${maxCapacity}.`,
    );
  }
}

/** Re-export for consumers that need the transition table via the exceptions module. */
export { getPermittedTargets };