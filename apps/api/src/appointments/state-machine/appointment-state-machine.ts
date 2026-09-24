import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, AppointmentStatus, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  canCheckInFrom,
  getPermittedTargets,
  isPermittedTransition,
} from './appointment-transitions';
import {
  AppointmentCannotCheckInFromCurrentStatusException,
  AppointmentVisitAlreadyExistsException,
  InvalidAppointmentTransitionException,
} from './appointment-state-machine.exceptions';

type AuditClient = PrismaClient | Prisma.TransactionClient;

/**
 * Result returned by every appointment state transition.
 */
export interface AppointmentTransitionResult {
  appointment: { id: string; status: AppointmentStatus };
  previousStatus: AppointmentStatus;
  nextStatus: AppointmentStatus;
  timestamp: Date;
}

/**
 * Result returned by the check-in operation.
 */
export interface CheckInResult {
  appointment: { id: string; status: AppointmentStatus };
  visit: { id: string };
  previousStatus: AppointmentStatus;
  timestamp: Date;
}

/**
 * AppointmentStateMachine
 *
 * Single responsibility: enforce the appointment lifecycle state machine.
 *
 * Every status change must flow through this service. It:
 *   1. Loads the current appointment and verifies it exists.
 *   2. Rejects any transition that is not in the canonical transition table.
 *   3. For check-in, validates the source status and ensures no existing visit.
 *   4. Persists the new status.
 *   5. Writes an immutable audit record capturing the actor, source status,
 *      target status and timestamp.
 *
 * The class is deliberately framework-agnostic in its core logic so that the
 * rules can be reused by controllers, other services, and tests.
 */
@Injectable()
export class AppointmentStateMachine {
  private readonly logger = new Logger(AppointmentStateMachine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Transition an appointment to `nextStatus`, enforcing the state machine.
   */
  async transition(
    appointmentId: string,
    nextStatus: AppointmentStatus,
    actorId: string,
    options: { client?: AuditClient } = {},
  ): Promise<AppointmentTransitionResult> {
    const appointment = await this.loadAppointment(appointmentId, options.client);
    const previousStatus = appointment.status;

    if (!isPermittedTransition(previousStatus, nextStatus)) {
      throw new InvalidAppointmentTransitionException(previousStatus, nextStatus);
    }

    const updated = await this.updateStatus(appointmentId, nextStatus, options.client);
    const timestamp = await this.recordTransition(
      actorId,
      appointmentId,
      previousStatus,
      nextStatus,
      options.client,
    );

    return {
      appointment: { id: updated.id, status: updated.status },
      previousStatus,
      nextStatus,
      timestamp,
    };
  }

  /**
   * Check in an appointment, creating a linked visit record atomically.
   *
   * This is the most complex transition because it must:
   *   1. Validate the appointment is in a check-in-able status.
   *   2. Ensure no existing visit has been created for this appointment.
   *   3. Create the visit record.
   *   4. Transition the appointment to CHECKED_IN.
   *   5. Audit both the visit creation and the status transition.
   */
  async checkIn(
    appointmentId: string,
    actorId: string,
    options: { client?: AuditClient } = {},
  ): Promise<CheckInResult> {
    if (options.client) {
      return this.checkInWithClient(appointmentId, actorId, options.client);
    }

    try {
      return await this.prisma.$transaction((transaction) =>
        this.checkInWithClient(appointmentId, actorId, transaction),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existingVisit = await this.prisma.clinicVisit.findFirst({ where: { appointmentId } });
        if (existingVisit) {
          throw new AppointmentVisitAlreadyExistsException(appointmentId, existingVisit.id);
        }
      }
      throw error;
    }
  }

  private async checkInWithClient(
    appointmentId: string,
    actorId: string,
    client: AuditClient,
  ): Promise<CheckInResult> {
    const appointment = await this.loadAppointment(appointmentId, client);
    const previousStatus = appointment.status;

    // Validate check-in source status
    if (!canCheckInFrom(previousStatus)) {
      throw new AppointmentCannotCheckInFromCurrentStatusException(previousStatus);
    }

    // Ensure no existing visit (1:1 enforcement)
    const existingVisit = await client.clinicVisit.findFirst({
      where: { appointmentId: appointmentId },
    });
    if (existingVisit) {
      throw new AppointmentVisitAlreadyExistsException(appointmentId, existingVisit.id);
    }

    const visit = await client.clinicVisit.create({
      data: {
        patientId: appointment.patientId,
        chiefComplaint: appointment.purpose,
        notes: appointment.notes ?? undefined,
        appointmentId,
      },
    });
    const updated = await client.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CHECKED_IN },
    });

    // Audit both the visit creation and the status transition
    await this.audit.record(
      actorId,
      AuditAction.VISIT_CREATED,
      'ClinicVisit',
      visit.id,
      { metadata: { source: 'appointment_check_in', appointmentId } },
      client,
    );

    const timestamp = await this.recordTransition(
      actorId,
      appointmentId,
      previousStatus,
      AppointmentStatus.CHECKED_IN,
      client,
    );

    return {
      appointment: { id: updated.id, status: updated.status },
      visit: { id: visit.id },
      previousStatus,
      timestamp,
    };
  }

  /**
   * Returns the permitted target statuses for a given state. Useful for UI
   * controls that want to grey-out disallowed actions.
   */
  getPermittedTargets(current: AppointmentStatus): readonly AppointmentStatus[] {
    return getPermittedTargets(current);
  }

  // ---- private helpers ---------------------------------------------------

  private async loadAppointment(appointmentId: string, client?: AuditClient) {
    const target = client ?? this.prisma;
    const appointment = await target.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException(`Appointment with id '${appointmentId}' not found.`);
    return appointment;
  }

  private async updateStatus(appointmentId: string, status: AppointmentStatus, client?: AuditClient) {
    const target = client ?? this.prisma;
    return target.appointment.update({ where: { id: appointmentId }, data: { status } });
  }

  private async recordTransition(
    actorId: string,
    appointmentId: string,
    fromStatus: AppointmentStatus,
    toStatus: AppointmentStatus,
    client?: AuditClient,
  ): Promise<Date> {
    const action = this.mapStatusToAuditAction(toStatus);
    await this.audit.recordEntityStatusTransition(
      actorId,
      'Appointment',
      appointmentId,
      action,
      fromStatus,
      toStatus,
      client,
    );
    return new Date();
  }

  private mapStatusToAuditAction(status: AppointmentStatus): AuditAction {
    switch (status) {
      case AppointmentStatus.PENDING:
        return AuditAction.APPOINTMENT_STATUS_PENDING;
      case AppointmentStatus.APPROVED:
        return AuditAction.APPOINTMENT_STATUS_APPROVED;
      case AppointmentStatus.CONFIRMED:
        return AuditAction.APPOINTMENT_STATUS_CONFIRMED;
      case AppointmentStatus.CHECKED_IN:
        return AuditAction.APPOINTMENT_CHECKED_IN;
      case AppointmentStatus.COMPLETED:
        return AuditAction.APPOINTMENT_STATUS_COMPLETED;
      case AppointmentStatus.CANCELLED:
        return AuditAction.APPOINTMENT_STATUS_CANCELLED;
      case AppointmentStatus.NO_SHOW:
        return AuditAction.APPOINTMENT_STATUS_NO_SHOW;
      case AppointmentStatus.RESCHEDULED:
        return AuditAction.APPOINTMENT_STATUS_RESCHEDULED;
      default:
        return AuditAction.STATUS_CHANGE;
    }
  }
}
