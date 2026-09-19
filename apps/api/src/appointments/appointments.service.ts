import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, AppointmentType, AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { APPOINTMENT_CAPACITY_POLICY, CapacityChecker } from './capacity/capacity-checker';
import { AppointmentStateMachine } from './state-machine/appointment-state-machine';
import { CreateAppointmentDto } from './dto';

/**
 * AppointmentsService
 *
 * Single responsibility: manage appointment lifecycle including creation,
 * status transitions, capacity validation, and check-in with visit linkage.
 *
 * All status changes flow through `AppointmentStateMachine`, which enforces
 * the canonical transition table, validates completion prerequisites, and
 * records an immutable audit entry.
 */
@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly capacity: CapacityChecker,
    private readonly stateMachine: AppointmentStateMachine,
  ) {}

  async create(dto: CreateAppointmentDto, actorId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { deletedAt: null, OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }] },
    });
    if (!patient) throw new NotFoundException('Active patient not found.');

    const scheduledAt = new Date(dto.scheduledAt);
    const type = dto.type ?? AppointmentType.CONSULTATION;
    const policy = APPOINTMENT_CAPACITY_POLICY[type];
    const durationMins = dto.durationMins ?? policy.defaultDurationMins;

    const appointment = await this.prisma.$transaction(async (transaction) => {
      await this.capacity.validate(dto.assignedToId, scheduledAt, durationMins, {
        patientId: patient.id,
        maxConcurrent: policy.maxConcurrent,
        client: transaction,
      });
      return transaction.appointment.create({
        data: {
          patientId: patient.id,
          scheduledAt,
          durationMins,
          purpose: dto.purpose,
          type,
          priority: dto.priority ?? 'ROUTINE',
          notes: dto.notes,
          assignedToId: dto.assignedToId,
        },
        include: { patient: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.audit.record(actorId, AuditAction.APPOINTMENT_CREATED, 'Appointment', appointment.id);
    return appointment;
  }

  upcoming() {
    return this.prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, AppointmentStatus.COMPLETED] },
      },
      include: { patient: true },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });
  }

  async updateStatus(id: string, status: AppointmentStatus, actorId: string) {
    if (status === AppointmentStatus.CHECKED_IN) {
      return this.stateMachine.checkIn(id, actorId);
    }
    if (status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Use the reschedule operation to reschedule an appointment.');
    }
    return this.stateMachine.transition(id, status, actorId);
  }

  /**
   * Check in an appointment, creating a linked visit record atomically.
   *
   * This is the most complex operation because it must:
   *   1. Validate the appointment is in a check-in-able status.
   *   2. Ensure no existing visit has been created for this appointment.
   *   3. Create the visit record.
   *   4. Transition the appointment to CHECKED_IN.
   *   5. Audit both the visit creation and the status transition.
   */
  async checkIn(id: string, actorId: string) {
    return this.stateMachine.checkIn(id, actorId);
  }

  /**
   * Reschedule an appointment to a new time slot.
   *
   * Compound operation:
   *   1. Validate original appointment is reschedulable.
   *   2. Validate capacity for the new time slot.
   *   3. Create new appointment with status PENDING or APPROVED.
   *   4. Mark original appointment as RESCHEDULED (terminal).
   *   5. Link via rescheduledFromId / rescheduledToId.
   */
  async reschedule(
    id: string,
    dto: { scheduledAt: string; durationMins?: number; reason?: string },
    actorId: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found.');

    // Validate reschedulable status
    if (appointment.status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Appointment has already been rescheduled.');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot reschedule a cancelled appointment.');
    }
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot reschedule a completed appointment.');
    }
    if (appointment.status === AppointmentStatus.NO_SHOW) {
      throw new BadRequestException('Cannot reschedule a no-show appointment.');
    }

    const newScheduledAt = new Date(dto.scheduledAt);
    const newDuration = dto.durationMins ?? appointment.durationMins;
    const policy = APPOINTMENT_CAPACITY_POLICY[appointment.type];

    // Validate capacity for new slot (exclude original appointment)
    // Atomic: validate the slot, create the replacement, and retire the original.
    const { newAppointment, updatedOriginal } = await this.prisma.$transaction(async (transaction) => {
      await this.capacity.validate(
        appointment.assignedToId ?? undefined,
        newScheduledAt,
        newDuration,
        {
          excludeAppointmentId: id,
          patientId: appointment.patientId,
          maxConcurrent: policy.maxConcurrent,
          client: transaction,
        },
      );
      const newAppointment = await transaction.appointment.create({
        data: {
          patientId: appointment.patientId,
          scheduledAt: newScheduledAt,
          durationMins: newDuration,
          purpose: appointment.purpose,
          type: appointment.type,
          priority: appointment.priority,
          notes: dto.reason ? `Rescheduled: ${dto.reason}` : appointment.notes,
          assignedToId: appointment.assignedToId,
          rescheduledFromId: id,
        },
        include: { patient: true },
      });
      const updatedOriginal = await transaction.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.RESCHEDULED },
      });
      return { newAppointment, updatedOriginal };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Audit both
    await this.audit.record(actorId, AuditAction.APPOINTMENT_STATUS_RESCHEDULED, 'Appointment', id);
    await this.audit.record(actorId, AuditAction.APPOINTMENT_CREATED, 'Appointment', newAppointment.id);

    return { newAppointment, originalAppointment: updatedOriginal };
  }

  async cancel(id: string, reason: string | undefined, actorId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found.');

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled.');
    }
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed appointment.');
    }
    if (appointment.status === AppointmentStatus.NO_SHOW) {
      throw new BadRequestException('Cannot cancel a no-show appointment.');
    }
    if (appointment.status === AppointmentStatus.CHECKED_IN) {
      throw new BadRequestException('Cannot reschedule a checked-in appointment.');
    }
    if (appointment.status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Cannot cancel a rescheduled appointment.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED, cancellationReason: reason },
    });

    await this.audit.record(actorId, AuditAction.APPOINTMENT_STATUS_CANCELLED, 'Appointment', id);
    return updated;
  }

  async markNoShow(id: string, actorId: string) {
    return this.stateMachine.transition(id, AppointmentStatus.NO_SHOW, actorId);
  }

  async complete(id: string, actorId: string) {
    return this.stateMachine.transition(id, AppointmentStatus.COMPLETED, actorId);
  }
}
