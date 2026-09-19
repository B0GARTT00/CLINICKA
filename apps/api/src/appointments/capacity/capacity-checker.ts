import { Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus, AppointmentType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AppointmentCapacityExceededException,
  AppointmentOverlapException,
} from '../state-machine/appointment-state-machine.exceptions';

type AuditClient = PrismaClient | Prisma.TransactionClient;

export const APPOINTMENT_CAPACITY_POLICY: Record<
  AppointmentType,
  { defaultDurationMins: number; maxConcurrent: number }
> = {
  [AppointmentType.CONSULTATION]: { defaultDurationMins: 30, maxConcurrent: 1 },
  [AppointmentType.FOLLOW_UP]: { defaultDurationMins: 15, maxConcurrent: 1 },
  [AppointmentType.VACCINATION]: { defaultDurationMins: 10, maxConcurrent: 2 },
  [AppointmentType.SCREENING]: { defaultDurationMins: 20, maxConcurrent: 1 },
  [AppointmentType.CLEARANCE]: { defaultDurationMins: 30, maxConcurrent: 1 },
  [AppointmentType.OTHER]: { defaultDurationMins: 30, maxConcurrent: 1 },
};

/**
 * CapacityChecker validates that a proposed appointment does not conflict
 * with existing bookings for the same provider/resource.
 *
 * The checker enforces:
 *   1. Time-slot overlap detection (using start time + duration)
 *   2. Concurrent appointment limits per provider (default: 1)
 *
 * It is framework-agnostic in its core logic so the rules can be reused by
 * controllers, other services, and tests.
 */
@Injectable()
export class CapacityChecker {
  private readonly logger = new Logger(CapacityChecker.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates that a proposed appointment can be created or rescheduled
   * without exceeding provider capacity or overlapping existing bookings.
   *
   * @param providerId - The provider/resource ID being booked (optional)
   * @param scheduledAt - The proposed start time
   * @param durationMins - The proposed duration in minutes
   * @param options - Optional settings:
   *   - `excludeAppointmentId`: Skip this appointment in conflict checks (for reschedule)
   *   - `maxConcurrent`: Override the default capacity limit
   *   - `client`: Optional Prisma transaction client
   */
  async validate(
    providerId: string | undefined,
    scheduledAt: Date,
    durationMins: number,
    options: {
      excludeAppointmentId?: string;
      maxConcurrent?: number;
      patientId?: string;
      client?: AuditClient;
    } = {},
  ): Promise<void> {
    const client = options.client ?? this.prisma;
    const maxConcurrent = options.maxConcurrent ?? 1;

    const proposedStart = new Date(scheduledAt);
    const proposedEnd = new Date(proposedStart.getTime() + durationMins * 60 * 1000);

    // Build the overlap query: find appointments that overlap with the proposed slot
    // An appointment overlaps if its [start, start+duration) intersects with [proposedStart, proposedEnd)
    // Prisma doesn't support computed fields in where, so we fetch active appointments for the
    // provider on the same day and filter in application code.

    const startOfDay = new Date(proposedStart);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(proposedStart);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Prisma.AppointmentWhereInput = {
      scheduledAt: { gte: startOfDay, lt: endOfDay },
      status: { in: [...isActiveStatuses()] },
    };

    if (options.excludeAppointmentId) {
      where.id = { not: options.excludeAppointmentId };
    }

    const existing = await client.appointment.findMany({ where });
    const overlapping = existing.filter((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.durationMins * 60 * 1000);
      return this.overlaps(proposedStart, proposedEnd, aptStart, aptEnd);
    });

    const patientConflict = options.patientId
      ? overlapping.find((appointment) => appointment.patientId === options.patientId)
      : undefined;
    if (patientConflict) {
      throw new AppointmentOverlapException('the patient', proposedStart, patientConflict.id);
    }

    const providerOverlaps = providerId
      ? overlapping.filter((appointment) => appointment.assignedToId === providerId)
      : [];
    const concurrentCount = providerOverlaps.length;

    if (concurrentCount >= maxConcurrent) {
      if (maxConcurrent === 1) {
        throw new AppointmentOverlapException('the provider', proposedStart, providerOverlaps[0].id);
      }
      throw new AppointmentCapacityExceededException(
        'the provider',
        proposedStart,
        concurrentCount,
        maxConcurrent,
      );
    }
  }

  /**
   * Returns the number of active appointments for a provider on a given day.
   * Useful for reporting and UI availability indicators.
   */
  async getProviderUtilization(
    providerId: string,
    date: Date,
    client?: AuditClient,
  ): Promise<{ scheduledAt: Date; durationMins: number; status: AppointmentStatus }[]> {
    const target = client ?? this.prisma;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return target.appointment.findMany({
      where: {
        assignedToId: providerId,
        scheduledAt: { gte: startOfDay, lt: endOfDay },
        status: { in: [...isActiveStatuses()] },
      },
      select: {
        scheduledAt: true,
        durationMins: true,
        status: true,
      },
    });
  }

  /**
   * Two intervals [aStart, aEnd) and [bStart, bEnd) overlap iff:
   *   aStart < bEnd AND bStart < aEnd
   */
  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
  }
}

/**
 * Re-exported helper to avoid circular imports with the transitions module.
 */
function isActiveStatuses(): AppointmentStatus[] {
  return [
    AppointmentStatus.PENDING,
    AppointmentStatus.APPROVED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
  ];
}
